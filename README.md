# Calendar Appointment App

Ứng dụng lịch hẹn đầy đủ với ASP.NET Core 8 backend và HTML/JS frontend.

## Cấu trúc project

```
CalendarApp/
├── Backend/
│   ├── CalendarApp.csproj
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Controllers/
│   │   └── AppointmentsController.cs
│   ├── Data/
│   │   ├── CalendarDbContext.cs
│   │   └── schema.sql
│   ├── DTOs/
│   │   └── AppointmentDtos.cs
│   ├── Models/
│   │   └── Entities.cs
│   └── Services/
│       └── AppointmentService.cs
└── Frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        ├── calendar.js
        └── app.js
```

## Yêu cầu hệ thống

- .NET 8 SDK
- SQL Server (LocalDB, Express, hoặc Full)
- Trình duyệt hiện đại

## Cài đặt và chạy

### 1. Cấu hình SQL Server

Mở `backend/appsettings.json` và sửa connection string (nếu cần):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=CalendarAppDB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

Với SQL Server Express:
```
Server=localhost\\SQLEXPRESS;Database=CalendarAppDB;Trusted_Connection=True;TrustServerCertificate=True;
```

### 2. Chạy backend

```bash
cd backend
dotnet restore
dotnet run
```

Database sẽ tự tạo khi khởi động (EnsureCreated). Server chạy tại `http://localhost:5000`.

Swagger UI: `http://localhost:5000/swagger`

### 3. Chạy frontend

Mở `frontend/index.html` trực tiếp trong trình duyệt, hoặc dùng Live Server (VS Code extension).

Nếu backend chạy port khác, sửa `API_BASE` trong `frontend/api.js`.

## Tính năng

- **Xem lịch**: Tháng / Tuần
- **Thêm lịch hẹn**: Click vào ngày/ô thời gian → dialog hiện ra
- **Sửa / Xóa**: Click vào chip lịch hẹn → popup hiện → nút Sửa / Xóa  
- **Validation**: Tên không được trống, giờ kết thúc > giờ bắt đầu
- **Phát hiện xung đột**: Cảnh báo khi trùng giờ, cho phép thay thế
- **Cuộc họp nhóm**: Hỏi tham gia nếu tên + thời lượng khớp group meeting
- **Nhắc nhở**: Chọn nhắc 5 phút / 30 phút / 1 giờ... trước
- **Màu sắc**: 6 màu khác nhau cho lịch hẹn

## API Endpoints

| Method | URL | Mô tả |
|--------|-----|--------|
| GET | /api/appointments | Lấy danh sách lịch hẹn |
| GET | /api/appointments/{id} | Lấy chi tiết |
| POST | /api/appointments | Tạo mới |
| PUT | /api/appointments/{id} | Cập nhật |
| DELETE | /api/appointments/{id} | Xóa |
| GET | /api/appointments/check-conflict | Kiểm tra xung đột |

## Mở rộng thêm

- Thêm JWT authentication (hiện đang dùng demo userId=1)
- Push notification cho reminders
- Chia sẻ lịch giữa users
- Import/Export iCal
