using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CalendarApp.Models;

public class User
{
    [Key]
    public int UserId { get; set; }
    [Required, MaxLength(100)]
    public string Username { get; set; } = "";
    [Required, MaxLength(200)]
    public string Email { get; set; } = "";
    [Required]
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

public class Appointment
{
    [Key]
    public int AppointmentId { get; set; }
    public int UserId { get; set; }
    [Required, MaxLength(200)]
    public string Name { get; set; } = "";
    [MaxLength(300)]
    public string? Location { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    [MaxLength(1000)]
    public string? Description { get; set; }
    [MaxLength(20)]
    public string Color { get; set; } = "#3B82F6";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [NotMapped]
    public int DurationMinutes => (int)(EndTime - StartTime).TotalMinutes;

    public int? GroupMeetingId { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }
    [ForeignKey("GroupMeetingId")]
    public GroupMeeting? GroupMeeting { get; set; }
    public ICollection<Reminder> Reminders { get; set; } = new List<Reminder>();
}

public class GroupMeeting
{
    [Key]
    public int MeetingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

public class Reminder
{
    [Key]
    public int ReminderId { get; set; }
    public int AppointmentId { get; set; }
    public DateTime ReminderTime { get; set; }
    [MaxLength(500)]
    public string? Message { get; set; }
    public bool IsTriggered { get; set; } = false;

    [ForeignKey("AppointmentId")]
    public Appointment? Appointment { get; set; }
}
