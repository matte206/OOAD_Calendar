-- Calendar App Database Schema
CREATE DATABASE CalendarAppDB;
GO

USE CalendarAppDB;
GO

CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL,
    Email NVARCHAR(200) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE Appointments (
    AppointmentId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL REFERENCES Users(UserId) ON DELETE CASCADE,
    Name NVARCHAR(200) NOT NULL,
    Location NVARCHAR(300),
    StartTime DATETIME2 NOT NULL,
    EndTime DATETIME2 NOT NULL,
    Description NVARCHAR(1000),
    Color NVARCHAR(20) DEFAULT '#3B82F6',
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT CHK_EndAfterStart CHECK (EndTime > StartTime),
    CONSTRAINT CHK_NameNotEmpty CHECK (LEN(TRIM(Name)) > 0)
);

CREATE TABLE GroupMeetings (
    MeetingId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    DurationMinutes INT NOT NULL,
    StartTime DATETIME2 NOT NULL,
    EndTime DATETIME2 NOT NULL,
    CreatedBy INT REFERENCES Users(UserId)
);

CREATE TABLE GroupMeetingParticipants (
    MeetingId INT REFERENCES GroupMeetings(MeetingId) ON DELETE CASCADE,
    UserId INT REFERENCES Users(UserId) ON DELETE CASCADE,
    JoinedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (MeetingId, UserId)
);

CREATE TABLE Reminders (
    ReminderId INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentId INT NOT NULL REFERENCES Appointments(AppointmentId) ON DELETE CASCADE,
    ReminderTime DATETIME2 NOT NULL,
    Message NVARCHAR(500),
    IsTriggered BIT DEFAULT 0
);

-- Seed demo user (password: demo123)
INSERT INTO Users (Username, Email, PasswordHash)
VALUES ('Demo User', 'demo@example.com', 'AQAAAAEAACcQAAAAEDemoHashForTesting==');

-- ============================================================
-- Seed 2 group meetings (dữ liệu giả mô phỏng sau ngày 8/5/2026)
-- Người tổ chức là userId = 2 (người khác), userId = 1 được mời vào
-- ============================================================

-- Tạo user giả làm organizer (nếu chưa tồn tại)
IF NOT EXISTS (SELECT 1 FROM Users WHERE UserId = 2)
BEGIN
    SET IDENTITY_INSERT Users ON;
    INSERT INTO Users (UserId, Username, Email, PasswordHash)
    VALUES (2, 'Nguyễn Văn An', 'an.nguyen@example.com', 'AQAAAAEAACcQAAAAEOrganizer2HashForTesting==');
    SET IDENTITY_INSERT Users OFF;
END
GO

-- Group Meeting 1: Họp lớp K21 — 10/5/2026, 09:00–11:00 (2 tiếng)
INSERT INTO GroupMeetings (Name, DurationMinutes, StartTime, EndTime, CreatedBy)
VALUES (
    N'Họp lớp K21',
    120,
    '2026-05-10 02:00:00',  -- 09:00 GMT+7
    '2026-05-10 04:00:00',  -- 11:00 GMT+7
    2
);
GO

-- Group Meeting 2: Họp công ty Quý 2 — 15/5/2026, 14:00–15:30 (90 phút)
INSERT INTO GroupMeetings (Name, DurationMinutes, StartTime, EndTime, CreatedBy)
VALUES (
    N'Họp công ty Quý 2',
    90,
    '2026-05-15 07:00:00',  -- 14:00 GMT+7
    '2026-05-15 08:30:00',  -- 15:30 GMT+7
    2
);
GO

-- Thêm userId = 1 (Demo User) vào cả 2 cuộc họp với tư cách người được mời
-- Meeting 1 — Họp lớp K21 (MeetingId = 1)
INSERT INTO GroupMeetingParticipants (MeetingId, UserId)
VALUES (1, 1);
GO

-- Meeting 2 — Họp công ty Quý 2 (MeetingId = 2)
INSERT INTO GroupMeetingParticipants (MeetingId, UserId)
VALUES (2, 1);
GO
