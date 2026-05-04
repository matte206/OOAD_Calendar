using Microsoft.AspNetCore.Mvc;
using CalendarApp.DTOs;
using CalendarApp.Services;

namespace CalendarApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly AppointmentService _service;
    private const int DemoUserId = 1; // Demo: dùng userId=1, thực tế dùng JWT auth

    public AppointmentsController(AppointmentService service)
    {
        _service = service;
    }

    /// <summary>Lấy lịch hẹn theo khoảng thời gian</summary>
    [HttpGet]
    public async Task<IActionResult> GetAppointments(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var appointments = await _service.GetAppointmentsAsync(DemoUserId, from, to);
        return Ok(appointments);
    }

    /// <summary>Lấy chi tiết một lịch hẹn</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var appt = await _service.GetByIdAsync(id, DemoUserId);
        if (appt == null) return NotFound(new { message = "Không tìm thấy lịch hẹn" });
        return Ok(appt);
    }

    /// <summary>Tạo lịch hẹn mới</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState
                .Where(x => x.Value?.Errors.Any() == true)
                .Select(x => new ValidationErrorDto
                {
                    Field = x.Key,
                    Message = x.Value!.Errors.First().ErrorMessage
                }).ToList();
            return BadRequest(new { errors });
        }

        if (dto.EndTime <= dto.StartTime)
            return BadRequest(new { message = "Thời gian kết thúc phải sau thời gian bắt đầu" });

        var result = await _service.CreateAsync(DemoUserId, dto);

        if (!result.Success)
        {
            if (result.Conflict?.HasConflict == true)
                return Conflict(new { message = result.ErrorMessage, conflict = result.Conflict });

            if (result.GroupMeetingMatch?.HasMatch == true)
                return Ok(new { requireGroupDecision = true, groupMatch = result.GroupMeetingMatch });

            return BadRequest(new { message = result.ErrorMessage });
        }

        return CreatedAtAction(nameof(GetById),
            new { id = result.Appointment!.AppointmentId },
            result.Appointment);
    }

    /// <summary>Cập nhật lịch hẹn</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAppointmentDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var updated = await _service.UpdateAsync(id, DemoUserId, dto);
            if (updated == null) return NotFound(new { message = "Không tìm thấy lịch hẹn" });
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Xóa lịch hẹn</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id, DemoUserId);
        if (!deleted) return NotFound(new { message = "Không tìm thấy lịch hẹn" });
        return NoContent();
    }

    /// <summary>Kiểm tra xung đột lịch</summary>
    [HttpGet("check-conflict")]
    public async Task<IActionResult> CheckConflict(
        [FromQuery] DateTime startTime,
        [FromQuery] DateTime endTime,
        [FromQuery] int? excludeId = null)
    {
        var result = await _service.CheckConflictAsync(DemoUserId, startTime, endTime, excludeId);
        return Ok(result);
    }
}
