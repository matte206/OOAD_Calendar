using Microsoft.EntityFrameworkCore;
using CalendarApp.Models;

namespace CalendarApp.Data;

public class CalendarDbContext : DbContext
{
    public CalendarDbContext(DbContextOptions<CalendarDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<GroupMeeting> GroupMeetings => Set<GroupMeeting>();
    public DbSet<GroupMeetingParticipant> GroupMeetingParticipants => Set<GroupMeetingParticipant>();
    public DbSet<Reminder> Reminders => Set<Reminder>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GroupMeetingParticipant>()
            .HasKey(gmp => new { gmp.MeetingId, gmp.UserId });

        modelBuilder.Entity<Appointment>()
            .HasCheckConstraint("CHK_EndAfterStart", "[EndTime] > [StartTime]");

        modelBuilder.Entity<Appointment>()
            .Property(a => a.Color)
            .HasDefaultValue("#3B82F6");

        modelBuilder.Entity<User>().HasData(new User
        {
            UserId = 1,
            Username = "Demo User",
            Email = "demo@example.com",
            PasswordHash = "demo",
            CreatedAt = DateTime.UtcNow
        });

        base.OnModelCreating(modelBuilder);
    }
}
