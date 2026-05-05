using Microsoft.EntityFrameworkCore;
using CalendarApp.Data;
using CalendarApp.DTOs;
using CalendarApp.Models;

namespace CalendarApp.Services;

public class AppointmentService
{
    private readonly CalendarDbContext _db;

    public AppointmentService(CalendarDbContext db)
    {
        _db = db;
    }

    public async Task<List<AppointmentResponseDto>> GetAppointmentsAsync(int userId, DateTime? from = null, DateTime? to = null)
    {
        var query = _db.Appointments
            .Where(a => a.UserId == userId)
            .Include(a => a.Reminders)
            .AsQueryable();

        if (from.HasValue) query = query.Where(a => a.EndTime >= from.Value);
        if (to.HasValue) query = query.Where(a => a.StartTime <= to.Value);

        var appts = await query.OrderBy(a => a.StartTime).ToListAsync();
        return appts.Select(MapToDto).ToList();
    }

    public async Task<AppointmentResponseDto?> GetByIdAsync(int appointmentId, int userId)
    {
        var appt = await _db.Appointments
            .Include(a => a.Reminders)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId && a.UserId == userId);
        return appt == null ? null : MapToDto(appt);
    }

    public async Task<CreateAppointmentResult> CreateAsync(int userId, CreateAppointmentDto dto)
    {
        // Validate duration
        if (dto.EndTime <= dto.StartTime)
        {
            return new CreateAppointmentResult
            {
                Success = false,
                ErrorMessage = "Thời gian kết thúc phải sau thời gian bắt đầu"
            };
        }

        // Check for conflicts
        var conflict = await CheckConflictAsync(userId, dto.StartTime, dto.EndTime);
        if (conflict.HasConflict && !dto.ForceReplace)
        {
            return new CreateAppointmentResult
            {
                Success = false,
                ErrorMessage = "Có xung đột lịch",
                Conflict = conflict
            };
        }

        // If force replace, delete conflicting appointments
        if (conflict.HasConflict && dto.ForceReplace)
        {
            var conflictIds = conflict.ConflictingAppointments.Select(c => c.AppointmentId).ToList();
            var toDelete = await _db.Appointments
                .Where(a => conflictIds.Contains(a.AppointmentId))
                .ToListAsync();
            _db.Appointments.RemoveRange(toDelete);
        }

        // Check for group meeting match
        var groupMatch = await FindGroupMeetingMatchAsync(userId, dto.Name, dto.Location, dto.StartTime, dto.EndTime);
        
        // Group match found but user hasn't decided yet
        if (groupMatch.HasMatch && !dto.JoinGroupMeeting && !dto.ForceReplace)
        {
            return new CreateAppointmentResult
            {
                Success = false,
                GroupMeetingMatch = groupMatch
            };
        }

        int? finalGroupMeetingId = null;

        if (groupMatch.HasMatch && dto.JoinGroupMeeting)
        {
            if (groupMatch.MeetingId.HasValue)
            {
                finalGroupMeetingId = groupMatch.MeetingId.Value;
            }
            else if (groupMatch.MatchedAppointmentId.HasValue)
            {
                // Mới chỉ có 1 lịch hẹn trước đó, giờ ta gom chúng thành Group
                var newGroup = new GroupMeeting { CreatedAt = DateTime.UtcNow };
                _db.GroupMeetings.Add(newGroup);
                await _db.SaveChangesAsync(); // Sinh ID cho GroupMeeting

                // Cập nhật lịch hẹn cũ
                var matchedAppt = await _db.Appointments.FindAsync(groupMatch.MatchedAppointmentId.Value);
                if (matchedAppt != null)
                {
                    matchedAppt.GroupMeetingId = newGroup.MeetingId;
                }
                
                finalGroupMeetingId = newGroup.MeetingId;
            }
        }

        // Create appointment
        var appointment = new Appointment
        {
            UserId = userId,
            Name = dto.Name.Trim(),
            Location = dto.Location?.Trim(),
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Description = dto.Description?.Trim(),
            Color = dto.Color,
            GroupMeetingId = finalGroupMeetingId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Appointments.Add(appointment);
        await _db.SaveChangesAsync();

        // Add reminder if specified
        if (dto.ReminderMinutesBefore.HasValue && dto.ReminderMinutesBefore.Value > 0)
        {
            var reminder = new Reminder
            {
                AppointmentId = appointment.AppointmentId,
                ReminderTime = dto.StartTime.AddMinutes(-dto.ReminderMinutesBefore.Value),
                Message = $"Nhắc nhở: {appointment.Name}"
            };
            _db.Reminders.Add(reminder);
            await _db.SaveChangesAsync();
        }

        var result = await GetByIdAsync(appointment.AppointmentId, userId);
        return new CreateAppointmentResult { Success = true, Appointment = result };
    }

    public async Task<AppointmentResponseDto?> UpdateAsync(int appointmentId, int userId, UpdateAppointmentDto dto)
    {
        var appt = await _db.Appointments
            .Include(a => a.Reminders)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId && a.UserId == userId);
        if (appt == null) return null;

        if (dto.EndTime <= dto.StartTime)
            throw new ArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");

        appt.Name = dto.Name.Trim();
        appt.Location = dto.Location?.Trim();
        appt.StartTime = dto.StartTime;
        appt.EndTime = dto.EndTime;
        appt.Description = dto.Description?.Trim();
        appt.Color = dto.Color;
        appt.UpdatedAt = DateTime.UtcNow;

        // Update reminders
        _db.Reminders.RemoveRange(appt.Reminders);
        if (dto.ReminderMinutesBefore.HasValue && dto.ReminderMinutesBefore.Value > 0)
        {
            appt.Reminders.Add(new Reminder
            {
                ReminderTime = dto.StartTime.AddMinutes(-dto.ReminderMinutesBefore.Value),
                Message = $"Nhắc nhở: {appt.Name}"
            });
        }

        await _db.SaveChangesAsync();
        return MapToDto(appt);
    }

    public async Task<bool> DeleteAsync(int appointmentId, int userId)
    {
        var appt = await _db.Appointments
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId && a.UserId == userId);
        if (appt == null) return false;
        _db.Appointments.Remove(appt);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<ConflictCheckResult> CheckConflictAsync(int userId, DateTime startTime, DateTime endTime, int? excludeId = null)
    {
        var query = _db.Appointments
            .Where(a => a.UserId == userId
                && a.StartTime < endTime
                && a.EndTime > startTime);

        if (excludeId.HasValue)
            query = query.Where(a => a.AppointmentId != excludeId.Value);

        var conflicts = await query.Include(a => a.Reminders).ToListAsync();

        return new ConflictCheckResult
        {
            HasConflict = conflicts.Any(),
            ConflictingAppointments = conflicts.Select(MapToDto).ToList()
        };
    }

    public async Task<GroupMeetingMatchResult> FindGroupMeetingMatchAsync(int currentUserId, string name, string? location, DateTime startTime, DateTime endTime)
    {
        var nameLower = name.Trim().ToLower();
        var locLower = (location ?? "").Trim().ToLower();

        // Tìm lịch hẹn của người khác khớp chính xác: Tên + Địa điểm + Thời gian
        var match = await _db.Appointments
            .Include(a => a.User)
            .Where(a => a.UserId != currentUserId 
                     && a.Name.ToLower() == nameLower 
                     && (a.Location ?? "").ToLower() == locLower
                     && a.StartTime == startTime 
                     && a.EndTime == endTime)
            .FirstOrDefaultAsync();

        if (match == null)
            return new GroupMeetingMatchResult { HasMatch = false };

        int participantCount = 1; // Mặc định là 1 (người mà ta vừa match được)
        if (match.GroupMeetingId.HasValue)
        {
            participantCount = await _db.Appointments
                .Where(a => a.GroupMeetingId == match.GroupMeetingId)
                .Select(a => a.UserId)
                .Distinct()
                .CountAsync();
        }

        return new GroupMeetingMatchResult
        {
            HasMatch = true,
            MeetingId = match.GroupMeetingId,
            MatchedAppointmentId = match.AppointmentId,
            MeetingName = match.Name,
            ParticipantCount = participantCount,
            MeetingStart = DateTime.SpecifyKind(match.StartTime, DateTimeKind.Utc),
            MeetingEnd = DateTime.SpecifyKind(match.EndTime, DateTimeKind.Utc),
            OrganizerName = match.User?.Username
        };
    }

    private static AppointmentResponseDto MapToDto(Appointment a) => new()
    {
        AppointmentId = a.AppointmentId,
        Name = a.Name,
        Location = a.Location,
        StartTime = DateTime.SpecifyKind(a.StartTime, DateTimeKind.Utc),
        EndTime = DateTime.SpecifyKind(a.EndTime, DateTimeKind.Utc),
        Description = a.Description,
        Color = a.Color,
        DurationMinutes = (int)(a.EndTime - a.StartTime).TotalMinutes,
        Reminders = a.Reminders.Select(r => new ReminderDto
        {
            ReminderId = r.ReminderId,
            ReminderTime = DateTime.SpecifyKind(r.ReminderTime, DateTimeKind.Utc),
            Message = r.Message
        }).ToList()
    };
}
