using Microsoft.EntityFrameworkCore;
using CalendarApp.Models;

namespace CalendarApp.Data;

public class CalendarDbContext : DbContext
{
    public CalendarDbContext(DbContextOptions<CalendarDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<GroupMeeting> GroupMeetings => Set<GroupMeeting>();
    public DbSet<Reminder> Reminders => Set<Reminder>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Appointment>()
            .HasCheckConstraint("CHK_EndAfterStart", "[EndTime] > [StartTime]");

        modelBuilder.Entity<Appointment>()
            .Property(a => a.Color)
            .HasDefaultValue("#3B82F6");

        modelBuilder.Entity<User>().HasData(
            new User
            {
                UserId = 1,
                Username = "Demo User",
                Email = "demo@example.com",
                PasswordHash = "demo",
                CreatedAt = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                UserId = 2,
                Username = "Nguyễn Văn An",
                Email = "an.nguyen@example.com",
                PasswordHash = "demo",
                CreatedAt = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        // Tạm thời ta chỉ cần seed các Appointment cá nhân của User 2.
        // Khi User 1 tạo trùng, nó sẽ tự gom nhóm.
        modelBuilder.Entity<Appointment>().HasData(
            new Appointment
            {
                AppointmentId = 1,
                UserId = 2,
                Name = "Họp lớp K21",
                Location = "Nhà hàng Phố Cổ",
                StartTime = new DateTime(2026, 5, 10, 2, 0, 0, DateTimeKind.Utc), // 09:00 GMT+7
                EndTime   = new DateTime(2026, 5, 10, 4, 0, 0, DateTimeKind.Utc), // 11:00 GMT+7
                Color = "#3B82F6",
                CreatedAt = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Appointment
            {
                AppointmentId = 2,
                UserId = 2,
                Name = "Họp công ty Quý 2",
                Location = "Hội trường tầng 3",
                StartTime = new DateTime(2026, 5, 15, 7, 0, 0, DateTimeKind.Utc), // 14:00 GMT+7
                EndTime   = new DateTime(2026, 5, 15, 8, 30, 0, DateTimeKind.Utc), // 15:30 GMT+7
                Color = "#3B82F6",
                CreatedAt = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        base.OnModelCreating(modelBuilder);
    }
}
