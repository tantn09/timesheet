# Kế hoạch ứng dụng timesheet và invoice

## Mục tiêu

Ứng dụng cho nhiều người dùng trong một tổ chức. User quản lý timesheet và invoice của mình; admin quản lý toàn bộ dữ liệu, khách hàng, project, user, role và permission.

## Stack

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Backend | Fastify, TypeScript, REST API |
| Database | PostgreSQL |
| ORM | Prisma và migration |
| PDF | HTML/CSS render bằng Playwright trên Node.js |

Tổ chức chung trong repository nhưng tách thành hai thư mục gốc `timesheet-fe` và `timesheet-be`; pnpm workspace quản lý lệnh chạy và dependency. Backend gồm các module auth, users/roles, customers, projects/rates, timesheets, invoices và settings. Định nghĩa API bằng OpenAPI; kiểm tra dữ liệu đầu vào và quyền tại backend.

## Thiết kế kỹ thuật frontend

- **Nền tảng:** Next.js App Router và TypeScript. Dùng Server Components cho layout và trang tải dữ liệu ban đầu; Client Components cho form, bảng, bộ lọc và thao tác tương tác.
- **UI:** Tailwind CSS và shadcn/ui cho biểu mẫu, bảng, dialog, thông báo và các thành phần giao diện quản trị. Thiết kế responsive cho máy tính và điện thoại.
- **Form:** React Hook Form kết hợp Zod để kiểm tra dữ liệu nhập và hiển thị lỗi theo trường.
- **Dữ liệu API:** TanStack Query quản lý request từ Client Components, cache, phân trang và làm mới danh sách sau CRUD. Tạo API client có kiểu dữ liệu dựa trên OpenAPI của Fastify để tránh lệch hợp đồng dữ liệu.
- **Bảng:** TanStack Table cho danh sách timesheet, invoice và các màn hình quản trị; trạng thái lọc, sắp xếp và phân trang được lưu trong URL để có thể chia sẻ đường dẫn.
- **Ngôn ngữ và giao diện:** next-intl cho tiếng Việt/tiếng Anh; next-themes cho chế độ sáng/tối. Lưu lựa chọn trong `user_settings` và áp dụng khi đăng nhập.
- **Điều hướng:** `/login`; khu vực user gồm `/timesheets`, `/invoices`, `/settings`; khu vực admin gồm `/admin/users`, `/admin/roles`, `/admin/customers`, `/admin/projects`, `/admin/rates`. Menu hiển thị theo permission của phiên hiện tại.
- **Tích hợp backend:** frontend gọi Fastify qua `/api/v1`, gửi session cookie HttpOnly. Next.js dùng thông tin phiên để điều hướng; Fastify kiểm tra quyền thực tế cho mọi API. PDF được tạo tại backend và tải từ endpoint invoice.
- **Luồng chính:** form timesheet bám các cột của mẫu Excel; màn hình invoice chọn giờ chưa lập hóa đơn, xem trước tổng GBP, phát hành và tải PDF.
- **Kiểm thử FE:** Vitest và Testing Library cho form, bảng và quyền hiển thị; Playwright E2E cho đăng nhập, CRUD timesheet, tạo invoice và tải PDF.

## Thiết kế kỹ thuật backend

- **Nền tảng:** một ứng dụng Fastify chạy trên Node.js, viết bằng TypeScript. Tổ chức các Fastify plugin theo module `auth`, `users`, `roles`, `customers`, `projects`, `rates`, `timesheets`, `invoices`, `settings`; mỗi module tách route, schema, service và truy vấn dữ liệu.
- **Hợp đồng API:** REST dưới `/api/v1`, mô tả bằng OpenAPI. Dùng JSON Schema cho request/response, thống nhất mã lỗi và hỗ trợ phân trang, lọc ở các endpoint danh sách. Không đưa thông tin nội bộ vào lỗi trả về client.
- **Xác thực:** email và mật khẩu được băm an toàn; session lưu trong PostgreSQL, session ID ngẫu nhiên gửi qua cookie `HttpOnly`, `Secure`, `SameSite`. Có đăng xuất, hết hạn phiên và đặt lại mật khẩu qua email. Cookie được đọc bằng `@fastify/cookie`.
- **Phân quyền:** role gồm các permission theo tài nguyên và hành động (`own`/`any`). Hook kiểm tra phiên và permission trước route; service tiếp tục kiểm tra quyền sở hữu bản ghi. Không cho xóa role đang dùng hoặc tước quyền admin cuối cùng.
- **Truy cập dữ liệu:** Prisma quản lý truy vấn và migration; dùng `numeric/decimal` cho GBP và lưu thời lượng timesheet theo phút. Các thay đổi liên quan invoice phải chạy trong transaction.
- **Tạo invoice:** kiểm tra các time entry thuộc đúng user, chưa được lập invoice, thuộc các project cùng khách hàng và có đơn giá user–project. Trong một transaction, tạo invoice, snapshot giờ/đơn giá/thông tin khách hàng và liên kết các entry. Ràng buộc duy nhất ở database ngăn dùng trùng entry khi có yêu cầu đồng thời. Invoice đã phát hành giữ số và dữ liệu; hủy bằng trạng thái `void`.
- **PDF:** tạo HTML/CSS từ snapshot invoice rồi render PDF bằng Playwright trên Node.js. Template được đối chiếu với `tan_tran_invoice_Oct_2026.pdf`; endpoint tải PDF kiểm tra quyền sở hữu hoặc quyền admin.
- **Vận hành:** log có request ID, xử lý lỗi tập trung, health check cho ứng dụng/database, cấu hình bằng biến môi trường và seed tài khoản admin đầu tiên.
- **Kiểm thử BE:** unit test cho tính tiền và permission; integration test với PostgreSQL cho CRUD và transaction invoice; API test cho xác thực, truy cập trái phép, lỗi dữ liệu và tải PDF.

## Thiết kế database

| Bảng | Trường chính | Vai trò |
| --- | --- | --- |
| `users` | `id`, `email` unique, `name`, `password_hash`, `status` | Tài khoản |
| `sessions` | `id`, `user_id`, `token_hash`, `expires_at` | Phiên đăng nhập có thể thu hồi |
| `roles`, `permissions`, `user_roles`, `role_permissions` | ID, khóa ngoại và khóa ghép unique | Role và permission tùy chỉnh |
| `customers` | `id`, `name`, địa chỉ và thông tin liên hệ/xuất hóa đơn | Bên nhận invoice |
| `projects` | `id`, `customer_id`, `name`, `status` | Project thuộc một khách hàng |
| `project_user_rates` | `project_id`, `user_id`, `hourly_rate_gbp`, `effective_from`, `effective_to` | Lịch sử đơn giá theo user–project |
| `time_entries` | `id`, `user_id`, `project_id`, `work_date`, `minutes`, `task`, `jira_sow_id`, `comment` | Nhật ký công việc |
| `invoices` | `id`, `owner_user_id`, `customer_id`, `number`, `status`, `issued_at`, `total_gbp`, snapshot khách hàng | Thông tin invoice |
| `invoice_lines` | `id`, `invoice_id`, mô tả, `minutes`, `hourly_rate_gbp`, `amount_gbp` | Dòng tiền đã chốt |
| `invoice_time_entries` | `invoice_id`, `time_entry_id` | Truy vết giờ được tính vào invoice |
| `user_settings` | `user_id`, `theme`, `language` | Tùy chọn giao diện |

Một customer có nhiều project; một user có nhiều time entry. Mỗi invoice thuộc một user và một customer, nhưng có thể gồm giờ từ nhiều project của customer đó. Tiền dùng PostgreSQL `numeric/decimal`, thời lượng lưu theo phút; `Hours` và `Days` là giá trị tính khi hiển thị, mặc định 8 giờ/ngày. `minutes` phải dương, đơn giá không âm. Số invoice đã phát hành là duy nhất.

Khi tạo invoice, dùng transaction để kiểm tra quyền, khách hàng, đơn giá và trạng thái chưa lập hóa đơn; ghi snapshot vào invoice line, liên kết time entry rồi tính tổng. Một time entry chỉ được gắn với tối đa một invoice còn hiệu lực. Nếu hủy invoice, giữ bản ghi và snapshot để đối soát, đồng thời giải phóng các time entry để có thể lập invoice mới; ràng buộc database phải ngăn việc chọn trùng khi có yêu cầu đồng thời.

Tạo chỉ mục cho `time_entries(user_id, work_date)`, `time_entries(project_id, work_date)`, `invoices(owner_user_id, issued_at)` và `invoices(customer_id, status)`. Trước migration đầu tiên, đối chiếu PDF mẫu để chốt các trường địa chỉ, mã thuế, hạn thanh toán và thông tin ngân hàng.

## Quy tắc bổ sung trước triển khai

- **Mẫu invoice:** dựng HTML/CSS theo PDF mẫu với thông tin người phát hành, khách hàng, số invoice, ngày phát hành, hạn thanh toán, dòng project/giờ/đơn giá, subtotal, discount, tax, total và tài khoản ngân hàng. Lưu snapshot khi phát hành; mặc định discount và tax bằng 0 nếu không nhập. Đối chiếu trực quan PDF một trang và nhiều trang với file gốc.
- **Vòng đời invoice:** `draft → issued → void`. Chỉ cấp số duy nhất khi phát hành, trong transaction. Có thể sửa giờ của invoice nháp; giờ thuộc invoice đã phát hành bị khóa. Khi hủy, giữ invoice để đối soát và giải phóng các time entry để có thể lập invoice mới.
- **Lịch sử đơn giá:** chọn đơn giá theo ngày làm việc của time entry rồi chụp vào invoice. Không cho các khoảng hiệu lực của cùng user–project chồng nhau.
- **Triển khai và email:** đóng gói Next.js và Fastify bằng Docker; PostgreSQL dùng lưu trữ bền vững. Cấu hình SMTP qua biến môi trường cho email đặt lại mật khẩu. Chạy migration khi triển khai; có health check, log, backup PostgreSQL hằng ngày và thử khôi phục backup trước khi sử dụng.

## Chức năng và dữ liệu

- Đăng nhập bằng email và mật khẩu; session trong cookie HttpOnly. Admin tạo user, gán role và cấu hình permission tùy chỉnh.
- User CRUD timesheet của mình trên mọi project đang mở; admin CRUD toàn bộ. Theo mẫu `Timesheet.xlsx`, bản ghi gồm người làm, project, ngày, giờ, ngày công, task, Jira / SOW ID và ghi chú. Lưu thời lượng theo phút; ngày công là giá trị tính từ giờ theo quy ước ngày làm việc.
- Admin CRUD khách hàng, project và đơn giá riêng cho từng cặp user–project.
- User CRUD invoice của mình; admin CRUD toàn bộ. Invoice lấy các giờ chưa lập hóa đơn từ nhiều project thuộc cùng một khách hàng, tính giờ × đơn giá theo user–project, dùng GBP. Không có bước duyệt timesheet.
- Khi lập invoice, chụp lại giờ, đơn giá và thông tin khách hàng. Một time entry chỉ thuộc tối đa một invoice còn hiệu lực. Invoice nháp có thể sửa/xóa; invoice đã phát hành chỉ có thể hủy bằng trạng thái `void` và vẫn giữ số, nội dung.
- Xuất PDF theo file `tan_tran_invoice_Oct_2026.pdf`; đối chiếu bố cục và trường dữ liệu của file mẫu trước khi hoàn thiện template.
- User và admin có cài đặt theme sáng/tối và ngôn ngữ tiếng Việt/tiếng Anh.

Các bảng chính: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `sessions`, `customers`, `projects`, `project_user_rates`, `time_entries`, `invoices`, `invoice_lines`, `invoice_time_entries`, `user_settings`. Dùng kiểu `numeric/decimal` cho tiền và transaction khi tạo invoice.

## API

REST API dưới `/api/v1`: `auth`, `me`, `timesheets`, `invoices`, `invoices/:id/pdf`; nhóm admin gồm `users`, `roles`, `customers`, `projects`, `project-user-rates`. Danh sách hỗ trợ phân trang và bộ lọc phù hợp. Backend kiểm tra quyền theo hành động và phạm vi `own`/`any`; không cho tước quyền admin cuối cùng.

## Thứ tự triển khai

1. Dựng `timesheet-fe`, `timesheet-be`, PostgreSQL, Prisma migration, seed admin và OpenAPI.
2. Xây auth, phân quyền, CRUD user, role, khách hàng, project và đơn giá.
3. Xây timesheet theo mẫu Excel, tổng hợp theo người và project.
4. Xây invoice, phát hành, hủy và PDF theo mẫu.
5. Hoàn thiện theme, ngôn ngữ, kiểm thử và cấu hình triển khai.

## Kiểm thử chấp nhận

- User không đọc/sửa dữ liệu người khác; permission tùy chỉnh có hiệu lực.
- Không thể lập invoice hai lần cho cùng giờ, kể cả khi gửi yêu cầu đồng thời.
- Invoice nhiều project chỉ nhận project cùng khách hàng; thiếu đơn giá thì báo lỗi rõ ràng.
- Thay đổi timesheet hoặc đơn giá không làm đổi invoice đã phát hành.
- Tổng tiền GBP chính xác; PDF khớp dữ liệu và mẫu ở trường hợp một trang, nhiều trang.

## Giả định

Hệ thống phục vụ một tổ chức và dùng một loại tiền GBP. Mọi user được thấy project đang mở. File Excel là mẫu nhập timesheet; file PDF là mẫu trình bày invoice.
