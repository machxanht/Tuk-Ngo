# Kiểm tra cảnh đua toàn màn hình và điều khiển lái

## Thay đổi có thể quan sát

- Canvas trùng toàn viewport khi đang đua, không còn bị cắt bởi header/score/footer. Các vùng chứa điều khiển trong suốt và `pointer-events: none`; từng nút vẫn nhận touch/keyboard.
- Tái hiện tap 60 ms bản trước: mô phỏng cho khoảng 0,0485 m dịch ngang. Bản mới dùng một nhịp lái 0,8 s; ca unit ở cùng tốc độ dịch khoảng 0,77 m sau 1,25 s. Browser còn kiểm tra thay đổi vị trí thật trên màn hình, không chỉ cờ input.
- Có góc so kè, sát ghe và toàn tuyến. Camera theo trục dọc sông, không xóa chuyển động ngang của ghe.
- Vệt luồng nước có lợi thế tối đa 4,5% tốc độ, tính theo cùng trường nước cho cả hai ghe. Không dựa vào tên đội/khoảng cách với người chơi. Đây là luật game được tác giả thiết kế.
- Cơ chế chèo, sức, nước rút, âm thanh và giải cúp hiện có được giữ. Không thay hình học áo hay các nguồn rig/motion được bảo vệ.

## Bằng chứng

`npm run lint`, `npm test`, `npm run build` đạt. Build không có cảnh báo Vite. Bộ test kiến trúc vẫn xác nhận 533 đỉnh / 896 tam giác / bốn boundary loops và 12 source hash được bảo vệ.

- [Touch, dịch chuyển trên màn hình và bố cục](local/checks.json): touch thật qua CDP, tap lái khi ngón chèo vẫn giữ, mouse click, ba camera, timing thủ công và hit-testing của nút. Canvas toàn viewport ở Việt/Khmer: 1024×768, 768×1024, 1180×430, 390×844. Không có lỗi JS/console.
- [Ba chế độ](modes/checks.json): luyện tập, AI, 61 đội, sáu lượt đến vô địch, lưu/mở lại cúp, hòa và loại; 384 mẫu tay người lái không rời cán dầm.
- [Menu/setup/help và flow](flow/checks.json): chọn đội, ngôn ngữ, pause/resume, góc toàn tuyến, surge, kết quả, vòng tiếp theo và lưu tiến trình.
- Unit điều khiển: tap/hold/cancel/blur riêng biệt; thả chèo không xóa nhịp lái; hỗ trợ không kéo đường đã chọn về giữa; mô phỏng không phụ thuộc 15/60/144 FPS.
- Unit chiến thuật: cùng một nhịp chèo, bộ điều khiển bám luồng hoàn tất nhanh hơn giữ thẳng khoảng bốn giây; đây là mô phỏng điều khiển tự động để kiểm tra lợi ích cơ chế, không phải phép thử người chơi.

## Bản công khai

[Link tablet cố định](https://machxanht.github.io/Tuk-Ngo/) đã được kiểm tra sau deploy nguồn `964c394`, Pages `4451ea7`.

- [38 file phục vụ khớp SHA-256 bản build](public/deployment.json).
- [Touch/hiển thị trên bản công khai](public/checks.json): tap 60 ms, khoảng 0,615 m dịch ngang khi kiểm tra, trên 7 px thay đổi vị trí giữa ghe; ngón chèo vẫn hoạt động. Cả tám tổ hợp ngôn ngữ/kích thước đều thấy canvas toàn viewport và nút không bị phần tử khác chặn.
- [Luyện tập, AI và toàn cúp trên bản công khai](public/modes/checks.json): sáu lượt đến vô địch, lưu/restore, hòa và loại đều đạt; không có lỗi JS/console.
- [Ảnh hai ghe và điều khiển trong suốt](public/manual-rhythm.png) đã được xem trực tiếp.

Xem [hướng gameplay và nghiên cứu Campuchia](../../gameplay-direction.md). Sân Campuchia, hành trình nhiều sân và native Khmer proofreading chưa được triển khai/xác minh ở đợt này. Chưa đo FPS, nhiệt hoặc độ trễ cảm ứng trên tablet thật. Các lượt hoàn chỉnh được tăng tốc qua engine thật để kiểm tra logic; không gọi đó là một buổi chơi thật hoặc bằng chứng người chơi thấy hấp dẫn.
