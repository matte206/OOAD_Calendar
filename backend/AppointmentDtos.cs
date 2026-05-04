using System.ComponentModel.DataAnnotations;

namespace CalendarApp.DTOs;

public class CreateAppointmentDto
{
    [Required(ErrorMessage = "Tên lịch hẹn không được để trống")]
    [MinLength(1, ErrorMessage = "Tên lịch hẹn không được để trống")]
    public string Name { get; set; } = "";
    public string? Location { get; set; }
    [Required]
    public DateTime StartTime { get; set; }
    [Required]
    public DateTime EndTime { get; set; }
    public string? Description { get; set; }
    public string Color { get; set; } = "#3B82F6";
    public int? ReminderMinutesBefore { get; set; }
    public bool ForceReplace { get; set; } = false;
    public bool JoinGroupMeeting { get; set; } = false;
}

public class UpdateAppointmentDto
{
    [Required(ErrorMessage = "Tên lịch hẹn không được để trống")]
    public string Name { get; set; } = "";
    public string? Location { get; set; }
    [Required]
    public DateTime StartTime { get; set; }
    [Required]
    public DateTime EndTime { get; set; }
    public string? Description { get; set; }
    public string Color { get; set; } = "#3B82F6";
    public int? ReminderMinutesBefore { get; set; }
}

public class AppointmentResponseDto
{
    public int AppointmentId { get; set; }
    public string Name { get; set; } = "";
    public string? Location { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Description { get; set; }
    public string Color { get; set; } = "#3B82F6";
    public int DurationMinutes { get; set; }
    public List<ReminderDto> Reminders { get; set; } = new();
}

public class ReminderDto
{
    public int ReminderId { get; set; }
    public DateTime ReminderTime { get; set; }
    public string? Message { get; set; }
}

public class ConflictCheckResult
{
    public bool HasConflict { get; set; }
    public List<AppointmentResponseDto> ConflictingAppointments { get; set; } = new();
}

public class GroupMeetingMatchResult
{
    public bool HasMatch { get; set; }
    public int? MeetingId { get; set; }
    public string? MeetingName { get; set; }
    public int ParticipantCount { get; set; }
}

public class CreateAppointmentResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public AppointmentResponseDto? Appointment { get; set; }
    public ConflictCheckResult? Conflict { get; set; }
    public GroupMeetingMatchResult? GroupMeetingMatch { get; set; }
}

public class ValidationErrorDto
{
    public string Field { get; set; } = "";
    public string Message { get; set; } = "";
}
