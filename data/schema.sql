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

-- Seed demo group meeting
INSERT INTO GroupMeetings (Name, DurationMinutes, StartTime, EndTime, CreatedBy)
VALUES ('Weekly Team Standup', 30, 
    DATEADD(day, 1, CAST(GETUTCDATE() AS DATETIME)),
    DATEADD(minute, 30, DATEADD(day, 1, CAST(GETUTCDATE() AS DATETIME))),
    1);
GO
