-- Calendar App Database Schema (Synchronized with SQL Server)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CalendarAppDB')
BEGIN
    CREATE DATABASE CalendarAppDB;
END
GO

USE CalendarAppDB;
GO

-- Drop existing tables in correct order
IF OBJECT_ID('Reminders', 'U') IS NOT NULL DROP TABLE Reminders;
IF OBJECT_ID('Appointments', 'U') IS NOT NULL DROP TABLE Appointments;
IF OBJECT_ID('GroupMeetings', 'U') IS NOT NULL DROP TABLE GroupMeetings;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- 1. Table Users
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL,
    Email NVARCHAR(200) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 2. Table GroupMeetings
CREATE TABLE GroupMeetings (
    MeetingId INT IDENTITY(1,1) PRIMARY KEY,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 3. Table Appointments
CREATE TABLE Appointments (
    AppointmentId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Location NVARCHAR(300) NULL,
    StartTime DATETIME2 NOT NULL,
    EndTime DATETIME2 NOT NULL,
    Description NVARCHAR(1000) NULL,
    Color NVARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    GroupMeetingId INT NULL,
    
    CONSTRAINT FK_Appointments_Users_UserId FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT FK_Appointments_GroupMeetings_GroupMeetingId FOREIGN KEY (GroupMeetingId) REFERENCES GroupMeetings(MeetingId) ON DELETE SET NULL,
    CONSTRAINT CHK_EndAfterStart CHECK (EndTime > StartTime)
);

-- 4. Table Reminders
CREATE TABLE Reminders (
    ReminderId INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentId INT NOT NULL,
    ReminderTime DATETIME2 NOT NULL,
    Message NVARCHAR(500) NULL,
    IsTriggered BIT NOT NULL DEFAULT 0,
    
    CONSTRAINT FK_Reminders_Appointments_AppointmentId FOREIGN KEY (AppointmentId) REFERENCES Appointments(AppointmentId) ON DELETE CASCADE
);

-- ==========================================
-- SEED DATA (Matching current SQL Server state)
-- ==========================================

SET IDENTITY_INSERT Users ON;
INSERT INTO Users (UserId, Username, Email, PasswordHash, CreatedAt)
VALUES 
(1, 'Demo User', 'demo@example.com', 'demo', '2026-05-01T00:00:00'),
(2, N'Nguyễn Văn An', 'an.nguyen@example.com', 'demo', '2026-05-01T00:00:00');
SET IDENTITY_INSERT Users OFF;

SET IDENTITY_INSERT GroupMeetings ON;
INSERT INTO GroupMeetings (MeetingId, CreatedAt)
VALUES (1, '2026-05-05T16:07:51');
SET IDENTITY_INSERT GroupMeetings OFF;

SET IDENTITY_INSERT Appointments ON;
INSERT INTO Appointments (AppointmentId, UserId, Name, Location, StartTime, EndTime, Description, Color, CreatedAt, UpdatedAt, GroupMeetingId)
VALUES 
(1, 2, N'Họp lớp K21', N'Nhà hàng Phố Cổ', '2026-05-10T02:00:00', '2026-05-10T04:00:00', NULL, '#3B82F6', '2026-05-01T00:00:00', '2026-05-01T00:00:00', 1),
(2, 2, N'Họp công ty Quý 2', N'Hội trường tầng 3', '2026-05-15T07:00:00', '2026-05-15T08:30:00', NULL, '#3B82F6', '2026-05-01T00:00:00', '2026-05-01T00:00:00', NULL);
SET IDENTITY_INSERT Appointments OFF;
