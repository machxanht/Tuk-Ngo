# Kế hoạch hoàn thiện game

Cập nhật 24/10/2026. Theo dõi cả phần đã triển khai và phần còn phải nghiệm thu;
không phải tuyên bố toàn bộ game đã hoàn thiện. Thứ tự ưu tiên đi từ trải nghiệm
chơi ổn định đến mở rộng nội dung. Giữ một link chính và các module hiện có;
không tạo thêm những bản demo hoặc bản có hậu tố phiên bản.

## Đã xử lý trong lần này

| Nhóm công việc | Thay đổi đã triển khai | Giới hạn còn lại |
| --- | --- | --- |
| Hiệu năng | Gộp áo dùng chung skeleton/material thành instanced draw; so sánh ảnh 24 tư thế ở hai loại ghe. Có nút xuất báo cáo hiệu năng ngay trong Tùy chỉnh. Giữ DPR 2 trong kiểm thử. | Giảm 46 draw calls/ghe ở phép thử cùng cảnh; chưa xác nhận cải thiện FPS trên tablet thật. Không tự hạ độ phân giải. |
| Hai nút và lái | Nhận giữ nút trong giây cuối đếm ngược, phản hồi nhấn ngay; release/cancel độc lập. Cảm biến ngừng gửi khi đang lái được trả về trung tính sau 1,5 giây và tự nhận lại khi có mẫu mới. | Touch/cảm biến đã giả lập; vẫn cần cầm tablet thật để duyệt cảm giác. |
| Ghe và VĐV | Giữ mesh và tám rig đã duyệt. Kiểm tra mesh thật 96 pha/hai kiểu thân ghe, chân và dằm theo ngưỡng kiểm tra hiện có. | Đây là kiểm tra hình học, không thay cho duyệt cận hình ảnh mọi đội và đối chiếu áo/kbach từng đội thật. |
| Roster | 61/16/8 tên riêng theo ba sân, có năm/nguồn; loại chev không có rig và tên chưa xác định sân khỏi thi đấu. | Chưa đủ 300+ tên đã đối chiếu; không biến OCR mờ thành tên chính thức. |
| Bối cảnh và banner | Bộ màu, địa danh Khmer, họa tiết và banner lớn riêng từng sân; thêm sáu họ nhà hậu cảnh và tán dừa lá xẻ cho Campuchia. | Bối cảnh là diễn họa có tham khảo, chưa phải bản đo đạc chính xác ngoài đời. |
| Audio và dashboard | 18 câu KM/EN theo sân và 24 tên đội Khmer; 42 MP3 có hash/nguồn/kiểm tra giải mã. Tab “Theo sân” lọc đúng map/ngôn ngữ, một player, có trạng thái duyệt/xuất yêu cầu. Tiếng Việt vẫn dùng bản thu nguồn. | Cờ duyệt người nghe Khmer vẫn false; không tuyên bố mọi tên/phát âm đã chuẩn bản ngữ. |
| Online và UI | Hai trình duyệt đua thật, reload/reconnect, Elo một lần; file hồ sơ mã hóa có thể chuyển điểm sang trình duyệt khác sau khi máy chủ xác nhận. VI/KM/EN cho thao tác mới. | Chuyển file thủ công, chưa phải tài khoản đăng nhập tự đồng bộ; chưa đo mạng di động và sức chứa nhiều người đồng thời. |

Banner dùng thiết kế chung của game nhưng có bộ nhận diện riêng:
Maspéro xanh ngọc/san hô và Khleang; Phnom Penh xanh hoàng gia/vàng và Tonlé Sap;
Siem Reap đất nung/xanh lam ngọc và sông đô thị. Không coi đây là dấu hiệu,
chứng nhận hay nhận tài trợ của ban tổ chức thật.

Các script có thể chạy lại: `check-completion-ui.py`, `check-shirt-batching.py`,
`check-crew-integrity.py`, `check-venue-narration.py`, `check-profile-transfer.py`,
`check-online-ui.py`, `profile-race-runtime.py` và `test-completion.mjs`.
Phần bằng chứng công khai được ghi ở `docs/qa/festival-completion/` sau phát hành.

| Sân | Danh sách chơi hiện tại | Phạm vi tư liệu |
| --- | --- | --- |
| Maspéro | 61 đăng ký Việt Nam | Roster giải 2025 đã có trong dự án |
| Phnom Penh | 16 tên đội | Tư liệu quốc gia/đội ghe 2019 và 2024 |
| Siem Reap | 8 tên đội riêng | Kết quả giải sông đô thị 2018, bốn nam và bốn nữ |

Chọn ghe, đối thủ AI, cúp và phòng online đều dùng danh sách của chính sân đó.
Không nhập chung các đội để tăng số lượng. Luyện tập và tiến độ cúp lưu riêng;
xếp hạng online cũng tách theo sân. Cúp cũ chứa đội sai sân được sao lưu trước
khi tạo lại. Không thay hình học áo đã kiểm định hoặc bộ chuyển động VĐV trong lần này.

Danh sách Campuchia là danh sách mời lịch sử trong game. Chưa có danh sách chính
thức 2026 đầy đủ, chưa có hơn 300 tên đội đã xác minh. Màu áo, số tay bơi, kết cấu
độc mộc và cúp trộn nam/nữ hiện là cách thể hiện của game, cần đối chiếu thêm.

## Các việc cần làm theo thứ tự

| Ưu tiên | Việc cần làm | Tiêu chí để chốt |
| --- | --- | --- |
| 1 | Đo và tối ưu trên tablet thật | Ghi model máy, trình duyệt, nhiệt độ/điều kiện chạy; đo tải lạnh, dung lượng mạng, bộ nhớ, FPS và frame time trong 10 phút ở khai mạc, đua và về đích. Chốt cấu hình đạt ít nhất 30 FPS ổn định trên máy mục tiêu; không tự hạ độ phân giải gây mờ. Đo trước khi thay LOD, số NPC hay texture. |
| 1 | Chốt cảm giác hai nút và lái nghiêng | Người mới hoàn thành luyện tập mà không cần giải thích thêm; hai ngón giữ/nhả độc lập, có phản hồi ngay, tăng tốc làm tụt thể lực rõ ràng. Hiệu chuẩn nghiêng khi đổi hướng màn hình, xử lý từ chối quyền và có cách lái dự phòng. Kiểm tra touch thật và độ trễ, không dùng kết quả giả lập để kết luận tablet nhạy. |
| 1 | Kiểm tra trọn vòng đời từng chế độ | Luyện tập, AI, cúp đều bắt đầu → intro → đếm ngược → đua → kết quả → chơi tiếp/về menu được; thử thắng, thua, hòa, pause, reload và tiếp tục cúp riêng từng sân. Khác biệt cự ly và dòng nước phải dễ hiểu bằng VI/KM/EN. |
| 2 | Hoàn chỉnh bộ đội theo từng giải/sân | Lấy danh sách xuất phát/kết quả có năm, mã đội, tên Khmer, nội dung nam/nữ và loại chèo. Đối chiếu trùng tên/đổi tên trước nhập; đủ tên thật mới công bố 300+. Phnom Penh và Siem Reap không dùng chung roster; không lấy tỉnh quê quán làm bằng chứng đã thi đấu tại sân. Tách hạng mục chev khi có rig phù hợp. |
| 2 | Hoàn thiện ghe và VĐV theo ảnh/clip thật | Kiểm tra cận đủ một chu kỳ ở cả hai mạn cho người ngồi, quỳ, điều khiển, đầu ghe và hai lái đuôi. Tay bám cán, dằm không xuyên mạn, chân nằm trong ghe, áo/quần/nón không rách. Giữ topology áo 533 đỉnh / 896 tam giác / 4 vòng biên và tám rig gốc. Màu áo, kbach, mũi/đuôi mỗi đội cần nguồn xác nhận thay vì coi màu game là đồ thật. |
| 2 | Soát từng bối cảnh bằng tư liệu địa phương | Đối chiếu khán đài, cầu, vạch xuất phát/đích, đường ven sông với ảnh/video của chính sân. Phnom Penh và Siem Reap có cảnh quan và giao thông riêng. Kiểm tra ngẫu nhiên người/xe/cụm cây không chồng xuyên, không chắn đường; banner Khmer đọc được trên tablet. Gộp mesh/material, chia vùng tải sau khi có số đo. |
| 2 | Chốt audio Việt–Khmer–English theo tình huống | Tên đội chỉ phát khi đúng đội/sân và đúng giai đoạn; không phát lịch sử chưa xác minh. Tiếng Việt dùng đoạn bình luận nguồn đã duyệt, KM/EN có provenance AI; cần người đọc Khmer duyệt tên/phát âm. Nghe thử dài trọn trận để kiểm tra nối câu, khoảng nghỉ, chồng tiếng và còi/trống theo dầm. Kiểm tra quyền sử dụng các đoạn thu trước phát hành rộng. |
| 3 | Củng cố online và xếp hạng | Thử hai thiết bị thật, mạng di động/Wi-Fi, mạng yếu, reload, mất kết nối và vào lại; một kết quả chỉ cộng điểm một lần. Thử tải đồng thời trước công bố sức chứa. Xếp hạng tách sân; cần quyết định tài khoản để đồng bộ nhiều máy thay cho guest hiện tại. Cân bằng thi đấu và chống spam phải dựa vào máy chủ. |
| 3 | Hoàn thiện giao diện, bản dịch và phát hành | Duyệt VI/KM/EN với người sử dụng, kiểm tra font Khmer, màn dọc/ngang, tìm đội và trạng thái trống/lỗi/tải lại. Giữ UI gọn và vùng xem lớn. Chốt ngân sách tải từng màn, cache có cập nhật đúng, kiểm tra bản công khai bằng đúng hash phát hành và có đường quay về bản ổn định. |

## Giới hạn của bằng chứng hiện có

- Test tự động có thể kiểm tra quy tắc đội/sân, mô phỏng, lưu tiến độ và API.
  Chúng không chứng minh áo đẹp, lời Khmer chuẩn hoặc máy tablet thật mượt.
- Lượt đua local được tăng tốc trong kiểm thử chỉ xác minh luồng kết quả/cúp.
  Kết quả online phải kiểm tra bằng kết nối máy chủ thật, không bằng mô phỏng local.
- Không đổi kiến trúc, thêm dịch vụ trả phí hoặc tải thêm hàng trăm GLB chỉ để
  có danh sách nhiều đội. Mỗi thay đổi tối ưu cần số đo trước/sau ở cùng cảnh.

Tư liệu tên đội và các phần chưa xác minh: [catalogue review](cambodia-roster-review.md)
và [course research](cambodia-research.md).
