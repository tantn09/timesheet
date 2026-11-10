# Tiến độ triển khai

Theo thứ tự ở `docs/plan.md`. Cập nhật mỗi khi hoàn thành một phần để các phiên sau biết tiếp tục từ đâu.

## Phase 1 — Scaffold (done trước khi theo dõi file này)
- [x] pnpm workspace, docker-compose Postgres, Prisma schema, seed admin.
- [x] Fastify app tối thiểu: auth login/logout/me, customers/projects (một phần), timesheets CRUD đầy đủ.
- [x] Next.js app tối thiểu: `/login`, `/timesheets` (hoạt động), `/invoices`, `/settings` (stub), rewrite `/backend/*` → API.

## Phase 2 — Auth, phân quyền, CRUD user/role/customer/project/rate
- [x] Backend: tách `server.ts` thành `lib/` (`prisma.ts`, `auth.ts`, `date-ranges.ts`) + `modules/` (auth, users, roles, customers, projects, rates, timesheets).
- [x] Permission thực theo `permissions` (session nạp `permissions` từ role) thay vì chỉ check role `admin`.
- [x] CRUD `users` (admin): list/create/update (status, roles, reset password)/delete; chặn xóa chính mình và hạ/xóa admin cuối cùng active (`countActiveAdmins`).
- [x] CRUD `roles` (admin): list/create/update permissions/delete (chặn nếu đang gán cho user, chặn sửa/xóa role `admin`); endpoint `GET /api/v1/permissions`.
- [x] CRUD đầy đủ `customers`, `projects` (PATCH/DELETE đã thêm; chặn xóa nếu còn project/invoice hoặc entry/rate liên quan).
- [x] CRUD `project-user-rates`: chặn khoảng hiệu lực chồng nhau cùng user–project (`rangesOverlap`, điểm null = vô hạn).
- [x] Test cho permission check, hash mật khẩu, và overlap đơn giá (`vitest`, 11 test, `pnpm --filter api test`).
- [x] Frontend: `AdminShell` theo permission (ẩn/khóa menu theo `/api/v1/me`), trang `/admin/users`, `/admin/roles`, `/admin/customers`, `/admin/projects`, `/admin/rates`.
- [x] Đã build thử: `tsc --noEmit` (BE+FE) và `next build` đều pass. Đã tạo và áp dụng migration đầu tiên trên PostgreSQL thật (`20261109143222_init`); API health và luồng tạo customer/project/rate/timesheet/invoice đã chạy thành công. Cần kiểm tra thêm toàn bộ CRUD/permission end-to-end.
- [ ] Chưa thêm test FE (Vitest/Testing Library) cho các trang admin.
- Quan hệ permission dùng để xem danh sách phụ (cho form chọn): `GET /roles` chấp nhận `users:manage` hoặc `roles:manage`; `GET /customers` chấp nhận `customers:manage` hoặc `projects:manage`; `GET /users` chấp nhận `users:manage` hoặc `rates:manage`. Ghi lại vì không có trong plan gốc.

## Phase 3 — Timesheet (hoàn thành)
- [x] CRUD timesheet cho user; admin xem tất cả.
- [x] Đối chiếu cột với `Timesheet.xlsx` (tìm thấy tại `~/Downloads/Timesheet.xlsx`, sharedStrings.xml): `Name, Project, Date, Hours, Days, Task, Jira / SOW ID, Comments (optional)`. Form/bảng đã có đủ; thêm cột "Name" vào bảng (trước đó bị thiếu dù dữ liệu đã có) và đổi nhãn "Comments" → "Comments (optional)".
- [x] Tổng hợp theo người/project: bảng summary (group theo `user.name + project.name`, tổng `minutes` → Hours/Days) dưới bảng timesheet chính.

## Phase 4 — Invoice (hoàn thành, trừ việc test với Postgres thật)
- [x] `lib/invoicing.ts`: `selectRate` (chọn đơn giá theo ngày, điểm null = vô hạn), `groupIntoLines` (gộp theo project+rate), `sumTotals` (discount/tax). 8 test.
- [x] `modules/invoices.ts`: chọn giờ chưa lập hóa đơn cùng khách hàng (`loadBillableEntries` kiểm tra chủ sở hữu, chưa link invoice nào, cùng customer, có đơn giá — báo lỗi rõ ràng nêu project+ngày thiếu đơn giá); tạo draft (transaction: invoice + lines + invoice_time_entries); sửa draft (thay đổi tập giờ/discount/tax, trừ chính nó khi kiểm tra "đã link"); xóa draft; `POST /issue` cấp số `INV-{year}-{seq}` trong transaction với retry khi đụng unique constraint (P2002); `POST /void` xóa `invoice_time_entries` (giải phóng giờ) nhưng giữ invoice+lines để đối soát.
- [x] Snapshot khách hàng (kèm `registrationNumber`, `vatNumber` — đã thêm 2 field này vào `Customer` vì mẫu PDF có) và đơn giá vào invoice line khi tạo.
- [x] PDF: `lib/invoice-template.ts` (HTML/CSS thuần, test escape HTML) + `lib/pdf.ts` (Playwright chromium) + route `GET /invoices/:id/pdf`. Đã cài `playwright install chromium` thành công trong môi trường này và **đối chiếu trực quan với file mẫu thật** `~/Downloads/Invoice/tan_tran_invoice_Oct_2026.pdf` (render thử bằng script tạm, so khớp bố cục: issuer/billed-to 2 cột, bảng Project/Unit cost/Qty-hr/Amount, subtotal/discount/tax-rate/tax/total, bảng Bank Account) — khớp tốt, có thể tinh chỉnh khoảng trắng sau. Script so sánh đã xóa, không commit dữ liệu PDF mẫu.
- [x] Issuer/bank info đọc từ biến môi trường (`INVOICE_ISSUER_*`, `INVOICE_BANK_*` trong `.env.example` với giá trị giả) — **không** hard-code IBAN/số tài khoản thật của user vào source.
- [x] Frontend `/invoices` thật: chọn khách hàng → chọn các dòng giờ chưa lập hóa đơn (checkbox) → nhập discount/tax → tạo draft; danh sách invoice với Phát hành/Hủy/Xóa/tải PDF theo trạng thái.
- [x] Đã test vòng đời thật (tạo draft £200 → issue → void → tái sử dụng giờ) qua API với PostgreSQL trong Docker; dữ liệu kiểm thử đã xóa sau khi chạy.

## Phase 5 — Hoàn thiện (đang làm)
- [x] `user_settings` API (`GET/PATCH /api/v1/settings`, upsert, validate theme ∈ {light,dark,system}, language ∈ {vi,en}).
- [x] `next-themes` thật: `ThemeProvider` trong `layout.tsx` (`attribute="data-theme"`), biến CSS sáng/tối trong `globals.css`, trang `/settings` đổi theme ngay + lưu vào `user_settings`.
- [x] `next-intl` đầy đủ: không dùng URL locale segment — locale đọc từ cookie `NEXT_LOCALE` qua `getRequestConfig` (`src/i18n/request.ts`), ép mọi route thành dynamic (xác nhận bằng `next build`: tất cả route chuyển từ `○ Static` → `ƒ Dynamic` sau khi thêm `cookies()`). Đã dịch toàn bộ string UI (146 key, `messages/vi.json` + `messages/en.json`, khớp key 100%) cho mọi trang: Home, Login, Timesheets, Invoices, Settings, AdminShell + 5 trang admin. `/settings` đổi ngôn ngữ set cookie + `router.refresh()`; `useSyncLocale` (trong AdminShell/TimesheetApp/InvoicesApp) tự đồng bộ cookie theo `user_settings.language` đã lưu khi vào trang khác thiết bị.
  - **Đã test thật** bằng `next dev` + `curl` với cookie `NEXT_LOCALE=vi`/`en` trên `/` và `/login` — phát hiện và sửa 1 bug thật: `NextIntlClientProvider` trong `layout.tsx` phải truyền tường minh `locale`/`messages` (lấy qua `getLocale()`/`getMessages()`), nếu không client component hiện literal key (`Login.email`) thay vì text dịch.
- [x] Vitest + Testing Library cho FE: `vitest.config.ts` (jsdom, `@vitejs/plugin-react`), `vitest.setup.ts` (jest-dom matchers + cleanup), helper `renderWithIntl`. Test: `timesheetSummary` (logic thuần, tách khỏi `TimesheetApp`), `LoginForm` (hiện label đúng locale, hiện lỗi server, redirect khi thành công — mock `fetch`/`window.location`), `AdminShell` (ẩn nav theo permission, render children khi đủ quyền, hiện thông báo không có quyền khi thiếu — phải `vi.mock('next/navigation')` vì `useRouter` ném lỗi ngoài cây Next thật). 10/10 pass (`pnpm --filter web test`).
- [ ] Playwright E2E — app + PostgreSQL đã chạy được bằng Docker; chưa viết/chạy bộ E2E.
- [x] `timesheet-be/Dockerfile`: multi-stage, build context là root repo (pnpm workspace); base image `mcr.microsoft.com/playwright:v1.65.0-noble` cho **cả** build lẫn runtime (cùng base tránh lệch ABI native giữa Prisma engine lúc build và lúc chạy); có browser Chromium sẵn cho PDF; `HEALTHCHECK` gọi `/health`.
- [x] `timesheet-fe/Dockerfile`: multi-stage dùng Next `output:'standalone'`. **Lưu ý quan trọng:** bật `standalone` qua `next.config.ts` chỉ khi có env `DOCKER_BUILD=1` (Dockerfile set env này trước khi build) — vì test trực tiếp trên máy Windows này, bật `standalone` vô điều kiện làm `next build` lỗi `EPERM` khi tạo symlink (Windows cần Developer Mode/quyền admin để tạo symlink, Linux trong container thì không vấn đề). Đã xác minh: build thường (không `DOCKER_BUILD`) vẫn chạy tốt trên Windows sau khi sửa.
- [x] `next.config.ts`: `/backend/*` rewrite dùng `API_ORIGIN` (mặc định `http://localhost:4000`) thay vì hard-code, để `docker-compose` trỏ sang service `api` (`http://api:4000`).
- [x] `docker-compose.yml`: thêm service `api` (depends_on postgres healthy) và `web` (depends_on api), cổng 4000/3000, biến môi trường issuer/bank đọc từ `.env` của host (mặc định rỗng/giả).
- [x] `.dockerignore` ở root (loại `node_modules`, `.next`, `dist`, `.git`, `.env*`).
- [x] `scripts/backup-db.sh` / `scripts/restore-db.sh`: `pg_dump`/`psql` qua `docker compose exec postgres`, nén gzip vào `backups/`. Chạy thủ công hoặc gắn cron/scheduled task — **chưa** tự động hóa lịch hằng ngày (không có hạ tầng cron trong phạm vi docker-compose hiện tại) và chưa test restore thật (cần Postgres chạy).
- [x] Đã build ảnh Docker thật và chạy Compose: PostgreSQL, API, web healthy; `GET /health`, `/login` và rewrite `/backend/api/v1` trả kết quả đúng. Sửa các lỗi phát hiện khi chạy thật: image Playwright thiếu `corepack` (cài pnpm trực tiếp), thư mục `public` của web không tồn tại, API phải chạy `dist/src/server.js`, và `API_ORIGIN` phải được đặt lúc build Next.js.

## Kiểm tra với Docker (2026-11-10)
- Migration đầu tiên được tạo tại `timesheet-be/prisma/migrations/20261109143222_init`; `prisma migrate status` báo schema đã đồng bộ.
- Seed role/permission đã chạy. Tài khoản và dữ liệu kiểm thử tạm đã xóa; cần cung cấp `ADMIN_EMAIL` và `ADMIN_PASSWORD` khi seed để tạo admin sử dụng thật.
- Còn phải kiểm tra E2E trên trình duyệt, toàn bộ CRUD/permission, PDF từ container, và thử backup/restore thật. Backup hằng ngày chưa được lên lịch.

## Đăng nhập bằng username
- Chuyển xác thực sang username; giữ email làm thông tin liên hệ và thêm username vào quản lý người dùng.
- Migration `20261110100000_add_username` điền username từ phần trước `@` của email hiện hữu; xử lý trường hợp trùng username bằng hậu tố ID.

## Kiểm tra tự động (autonomous tick)
- Build `dist/` thật và chạy `node dist/src/server.js` (DB giả không tồn tại) để xác nhận lần đầu server thực sự khởi động được (trước giờ chỉ `tsc`/`vitest`, chưa chạy thật): tất cả 8 module (auth/users/roles/customers/projects/rates/timesheets/invoices/settings) đăng ký route không lỗi. Xác nhận: route công khai (`GET /api/v1`) trả 200; route cần auth (`/me`, `/users`, `/invoices`, `/settings`) trả 401 đúng khi không có cookie; route cần DB khi DB không có (`/health`, `/auth/login`) trả 500 "Internal server error" đã làm sạch (không lộ stack trace), lỗi Prisma thật vẫn được log phía server; process không bị crash. Đọc lại kỹ `modules/invoices.ts` và `modules/users.ts` (phần bảo vệ admin cuối cùng) — không thấy bug mới.

## Ghi chú quyết định (rulings)
- Bỏ qua quy trình SDD/ledger/worktree đầy đủ của superpowers cho dự án cá nhân này — codebase hiện tại gọn nhẹ, đã có unit test nhưng chưa có OpenAPI; áp machinery nặng sẽ chậm hơn lợi ích. Tiếp tục theo phong cách hiện có (dense, hand-rolled), vẫn test các logic rủi ro (permission, overlap đơn giá, tính tiền invoice).
- `/loop` tự động: không dừng lại hỏi xác nhận kế hoạch giữa các bước; coi tài liệu này là "ledger" nhẹ để resume sau compaction.
