# KHAI BÁO SỬ DỤNG AI BÀI BACKEND

## 1. Thông tin chung

-   **Tên dự án:** Todo App
-   **Phần thực hiện:** Phần 2 -- Backend Hackathon
-   **Mục đích sử dụng AI:** Hỗ trợ phân tích yêu cầu, đề xuất kiến
    trúc, xây dựng mã nguồn ban đầu, kết nối frontend với backend, rà
    soát và điều chỉnh giao diện.

## 2. Công cụ AI đã sử dụng

  -----------------------------------------------------------------------
  Công cụ                             Mục đích sử dụng
  ----------------------------------- -----------------------------------
  Claude                              Hỗ trợ lên ý tưởng, thiết kế UI/UX
                                      và xây dựng cấu trúc, mã nguồn ban
                                      đầu cho ứng dụng Todo App.

  GitHub Copilot trong Visual Studio  Hỗ trợ rà soát, kết nối frontend
  Code                                với backend và database; điều chỉnh
                                      giao diện, font chữ và bố cục bộ
                                      lọc.
  -----------------------------------------------------------------------

## 3. Nội dung sử dụng AI

### 3.1. Khởi tạo các thành phần của bài tập (Mục 2.1)

**Công cụ:** Claude

AI được cung cấp yêu cầu xây dựng website quản lý công việc cá nhân
(Personal Task Management) theo mô hình Todo App. Nội dung yêu cầu bao
gồm:

-   Đề xuất concept giao diện hiện đại, tối giản, sử dụng tông màu
    pastel tím -- hồng và có khả năng responsive.
-   Xây dựng các trang Dashboard -- Today's Tasks, Task Management và
    Statistics.
-   Đề xuất kiến trúc frontend, backend Node.js -- Express.js và
    database.
-   Thiết kế cơ sở dữ liệu gồm các bảng Tasks, Categories cùng khóa
    chính, khóa ngoại và các ràng buộc dữ liệu.
-   Xây dựng RESTful API phục vụ các chức năng CRUD, tìm kiếm, lọc, sắp
    xếp và thống kê.
-   Tạo dữ liệu mẫu, file seed và hướng dẫn cài đặt, khởi chạy dự án.
-   Tổ chức mã nguồn thành các thư mục frontend, backend và database
    riêng biệt.

Claude được yêu cầu trực tiếp tạo các file cần thiết trong project hiện
tại, thay vì chỉ cung cấp mã nguồn minh họa.

**Kết quả tham khảo:**\
[Cuộc trò chuyện với
Claude](https://claude.ai/share/1feefa7d-3ff6-4546-aaf9-c7f3529cef5b)

### 3.2. Kết nối frontend với backend (Mục 2.2)

**Công cụ:** GitHub Copilot trong Visual Studio Code

Copilot được sử dụng để hỗ trợ kiểm tra và hoàn thiện phần kết nối
backend với database theo các yêu cầu:

-   Tổ chức luồng xử lý theo cấu trúc routes → controllers →
    models/services.
-   Hoàn thiện 9 endpoint API theo đề bài và thống nhất cấu trúc JSON
    trả về.
-   Bổ sung xử lý các mã trạng thái HTTP 400, 404 và 500; không hiển thị
    thông tin lỗi nội bộ cho người dùng.
-   Thực hiện tìm kiếm, lọc và sắp xếp dữ liệu trực tiếp trong câu truy
    vấn SQL.
-   Rà soát các ràng buộc trong `schema.sql`, bao gồm tiêu đề không được
    để trống, ngày hết hạn không trước ngày bắt đầu và thời điểm hoàn
    thành chỉ được ghi nhận khi task có trạng thái Completed.
-   Tính toán trạng thái quá hạn và các chỉ số thống kê trực tiếp từ dữ
    liệu trong bảng Tasks.
-   Kiểm tra dữ liệu mẫu trong `mock-data.json` và cơ chế khởi tạo dữ
    liệu bằng `seed.js`.

### 3.3. Điều chỉnh giao diện

Trong quá trình xem giao diện trên trình duyệt, phát hiện lỗi hiển thị
font tiếng Việt và bố cục bộ lọc chưa hợp lý. Copilot tiếp tục được sử
dụng để hỗ trợ điều chỉnh:

-   Thay font chữ nội dung sang **Be Vietnam Pro** nhằm cải thiện khả
    năng hiển thị tiếng Việt.
-   Sắp xếp lại các thành phần bộ lọc để giao diện gọn gàng hơn.
-   Điều chỉnh vị trí biểu tượng mũi tên trong các trường chọn để tránh
    tình trạng hiển thị lệch.

## 4. Phạm vi hỗ trợ và mức độ can thiệp của AI

AI được sử dụng như một công cụ hỗ trợ trong quá trình phát triển phần
mềm, không thay thế hoàn toàn quá trình thực hiện và kiểm tra của người
thực hiện.

Các nội dung AI hỗ trợ gồm:

1.  Phân tích yêu cầu và gợi ý giải pháp kỹ thuật.
2.  Đề xuất cấu trúc dự án, thiết kế cơ sở dữ liệu và luồng xử lý.
3.  Sinh mã nguồn ban đầu và hỗ trợ chỉnh sửa, hoàn thiện mã nguồn.
4.  Gợi ý cách kết nối frontend, backend và database.
5.  Hỗ trợ phát hiện, giải thích và khắc phục một số vấn đề về giao diện
    hoặc mã nguồn.

Người thực hiện có trách nhiệm xem xét mã nguồn được AI đề xuất, điều
chỉnh cho phù hợp với cấu trúc dự án và yêu cầu bài tập, đồng thời kiểm
tra lại kết quả trước khi sử dụng.

## 5. Kiểm tra và xác nhận kết quả

Các nội dung được AI hỗ trợ cần được kiểm tra trong môi trường phát
triển thực tế, bao gồm:

-   Kiểm tra khả năng khởi chạy backend Express.
-   Kiểm tra kết nối giữa frontend, backend và database.
-   Kiểm tra các chức năng thêm, xem, sửa, xóa và cập nhật trạng thái
    công việc.
-   Kiểm tra tìm kiếm, lọc và sắp xếp công việc.
-   Đối chiếu dữ liệu hiển thị trên trang thống kê với dữ liệu trong
    database.
-   Kiểm tra giao diện trên trình duyệt, đặc biệt là font tiếng Việt và
    bố cục các thành phần.

Việc AI tạo hoặc đề xuất mã nguồn không đồng nghĩa với việc toàn bộ mã
nguồn đã được xác minh là chính xác. Kết quả cuối cùng cần được người
thực hiện chạy thử và đánh giá.

## 6. Cam kết

Tôi xác nhận đã sử dụng các công cụ AI nêu trên với mục đích hỗ trợ học
tập và phát triển sản phẩm trong phạm vi bài thực hành Backend
Hackathon. Tôi chịu trách nhiệm rà soát, điều chỉnh, kiểm tra và hiểu
các nội dung được sử dụng trong sản phẩm cuối cùng; không xem kết quả do
AI tạo ra là mặc nhiên chính xác.

------------------------------------------------------------------------

*Ghi chú: Nội dung khai báo này phản ánh các công cụ và phạm vi sử dụng
AI được trình bày trong quá trình thực hiện dự án.*
