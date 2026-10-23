# Hướng gameplay và mở rộng sân đua Campuchia

## Kết luận thiết kế

Game nên tập trung vào **điều khiển một tập thể chèo cùng nhịp**, với ba việc người chơi hiểu ngay: chèo cho đều, chọn đường nước, và dành sức bứt tốc. Màu sắc, khán giả, hoa văn và âm thanh lễ hội tạo bản sắc; chúng không thay thế được quyết định của người chơi. Thêm nhiều asset đơn thuần không giải quyết cảm giác đang xem một cảnh hoạt họa.

Đợt này triển khai trên sân Maspéro đang hoạt động: cảnh 3D toàn viewport, nút nổi bán trong suốt, chạm/giữ lái có phản hồi rõ, camera gần hơn không triệt tiêu chuyển động ngang, và một lợi thế đọc luồng nước. Chưa phát hành sân Campuchia, chế độ online hay hệ thống sự nghiệp.

## Vì sao bản trước chưa có cảm giác lái

Ca tái hiện ở cùng tốc độ, chạm lái 60 ms: bản trước chỉ lệch khoảng 0,0485 m sau một giây. Khi thả, hỗ trợ còn kéo ghe về giữa; camera lại đi theo vị trí ngang. Tín hiệu đã vào mô phỏng nhưng phản hồi nhìn thấy quá nhỏ. Vì vậy kiểm tra `steeringInput != 0` là chưa đủ.

Sửa tại `race-controls.mjs`: chạm dưới 200 ms tạo một nhịp lái 0,8 giây; giữ nút thì lái liên tục. Thả chèo không xóa nhịp lái và thả lái không xóa ngón chèo. Hủy contact, pause và blur không tự thêm nhịp lái. Hỗ trợ trong `race-steering.mjs` chỉ bảo vệ mép làn, không xóa đường đã chọn. Ghe cần đang chèo/chạy để dịch ngang; khi đứng yên nút nhắc “Chèo để đi”.

Camera dùng mốc theo dọc đường đua, giữ trục ngang theo làn thay vì theo ghe. Có góc so kè, góc sát ghe và toàn tuyến. Tài liệu GDC về camera phân biệt góc đua và góc trình diễn, đồng thời đề cập độ trễ vị trí/hướng để tăng cảm nhận phản hồi của xe/thuyền. Đây là cơ sở chọn camera theo đường chạy có độ trễ, không liên tục cắt cảnh khi người chơi đang thao tác. [GDC — Fundamentals of Real-Time Camera Design](https://media.gdcvault.com/gdc05/slides/GD_Haigh-Hutchinson_FundamentalsReal-TimeCameraDesign2.pdf).

## Vòng chơi và lựa chọn

| Khoảng thời gian | Người chơi làm gì | Phản hồi / hệ quả |
| --- | --- | --- |
| Mỗi nhịp | Giữ CHÈO với hỗ trợ, hoặc tự chạm theo nhịp | Tay bơi, còi, nước té và tín hiệu nút cùng nhịp; hỗ trợ giúp người mới vào chơi được ngay |
| Mỗi vài giây | Nhìn vệt nước sáng, chỉnh trái/phải để bám luồng | Ghe thật sự đổi hướng/dịch ngang; chữ “Luồng thuận” xác nhận lợi thế, tối đa +4,5% tốc độ |
| Trong đường trường | Giữ sức khi mệt, trở lại đều nhịp khi đủ lực | Hồi sức đổi lấy tốc độ thấp hơn; không có một nút nước rút dùng mãi vẫn thắng |
| 250 m cuối | Chọn thời điểm nước rút và ĐẠP | Tiêu lực/sức cho đợt bứt tốc ngắn; nước té mạnh và khán giả tăng cao trào theo hệ thống hiện có |
| Sau lượt | Xem kết quả thực, mức bắt luồng, tiếp tục cúp hoặc đua lại | Người chơi biết mình có thể cải thiện phần nào |

Luồng sáng là **cơ chế được tác giả thiết kế cho game**, không phải bản đo thủy văn Maspéro. `race-flow.mjs` tính từ cự ly và seed; không đọc tên đội, thứ hạng lịch sử hay khoảng cách với người chơi. Đường tốt thay đổi theo vị trí dọc sông, AI đọc cùng trường nước theo năng lực riêng. `race-water.mjs` vẽ 16 dấu nước phía trước bằng một instanced mesh, không tải thêm GLB. Chỉ hiện trong góc chơi; không đưa dấu hỗ trợ vào cảnh khai mạc.

Độ khó AI tách khỏi hỗ trợ nhập liệu. Nintendo cũng tách Smart Steering/Auto-Accelerate để người mới luyện một kỹ năng trong khi được hỗ trợ kỹ năng còn lại. Áp dụng nguyên tắc đó ở đây: hỗ trợ chèo không thay người chơi chọn luồng và quyết định giữ sức. Không sao chép cơ chế drift, vật phẩm hay va chạm kart vào ghe Ngo. [Nintendo — Beginner Basics](https://www.nintendo.com/jp/ichikara/aabpa/index_en.html).

Đầu vào cần đơn giản, có lựa chọn độ khó, chỉ dẫn trong game và phản hồi nghe/nhìn bổ sung nhau. Nút trong cảnh vẫn có tên truy cập, focus và vùng chạm lớn; nền các vùng chứa không nhận pointer để không chặn thao tác trên cảnh. [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/).

## Mở rộng Campuchia theo hai sân riêng

**Ưu tiên 1: Phnom Penh — Tonlé Sap, khu vực trước Hoàng cung.** Đài phát thanh quốc gia xác nhận địa điểm lễ hội 2024 và việc các ghe từ các tỉnh tập trung tại đây. Đây là cơ sở chọn sân đua lớn, bờ đô thị và không gian lễ hội cấp quốc gia. Cần đối chiếu hướng xuất phát/đích, các mốc kiến trúc, bề rộng sông và bờ đối diện từ ảnh/video cùng một kỳ giải. Không bê hai khán đài đối xứng của Maspéro sang. [RNK, lễ hội 14–16/11/2024](https://rnk.gov.kh/article/43375).

Danh sách đăng ký Phnom Penh 2024 được Bộ Thông tin công bố là 348 ghe. Con số này không phải một bảng đấu loại trực tiếp 348 đội để tự suy ra luật; cần hồ sơ kỹ thuật giải và danh sách theo hạng ghe trước khi xây giải đấu trong game. Chưa xác minh đủ tên, loại ghe, số tay bơi, kết cấu, tư thế và thể thức từng hạng. [Bộ Thông tin Campuchia, 15/11/2024](https://www.information.gov.kh/articles/144807).

**Ưu tiên 2: Siem Reap.** Hồ sơ chính thức mô tả đua ghe và hoạt động lễ hội dọc sông Siem Reap, cùng ẩm thực, sản phẩm địa phương và biểu diễn. Đề xuất thiết kế một sân gần bờ, thiên về quan sát và chọn đường, có kiến trúc/cầu/cây theo ảnh thực địa riêng. Cự ly và quy mô ghe phải xác minh trước; đây là định hướng game, chưa phải khẳng định toàn bộ khác biệt kỹ thuật với Phnom Penh. [Bộ Thông tin Campuchia, 15/10/2024](https://www.information.gov.kh/articles/142214).

Nguồn hình tham khảo cần gắn năm cụ thể. Không tự gọi sân Phnom Penh là bản tái hiện giải chính thức 2026: AKP đã thông báo tạm dừng lễ hội chính ở Phnom Penh năm đó. Có thể dùng bối cảnh lễ hội lịch sử 2024, hoặc ghi rõ sân được tái hiện cho game. [AKP, 30/6/2026](https://mail.akp.gov.kh/post/detail/374510).

## Những gì dùng chung và phải làm riêng

| Dùng chung | Riêng theo sân / giải |
| --- | --- |
| Mô phỏng nhịp, sức, input, camera cơ sở, hệ thống kết quả | Cự ly, tim sông, bề rộng, hướng đua, mốc xuất phát/đích, đường giới hạn |
| Pipeline người/áo/nón, cache vật liệu, NPC instancing | Kích thước/kết cấu ghe, số người và vai trò theo hạng được xác minh |
| Hệ thống hoa văn có nguồn, bảng màu và texture atlas | Tên đội, số ghe, bộ màu, logo và kbach có nguồn của từng đội Campuchia |
| Bộ điều phối bình luận, trống/còi và UI Việt–Khmer | Kịch bản địa danh/tên đội/kết quả đúng sân; không phát lịch sử Sóc Trăng cho đội Campuchia |
| Luồng nước game dạng hàm theo cự ly/seed | Cấu hình độ mạnh và giới hạn theo thiết kế từng sân, không gắn nhãn số đo thực |

Hiện nhiều đoạn còn gắn 1.200 m và Maspéro: `gameplay.mjs`, `race-camera.mjs`, `boat-preview.mjs`, `game-language.ts`, `race-audio.mjs`. Khi có sân thứ hai được xác minh, đưa chúng về một cấu hình venue gồm `length`, `centerline`, `lanes`, `landmarks`, `camera`, `flow`, `roster`, `audioContext`. Không tạo một bản game sao chép hoặc file có số phiên bản cho mỗi nước. Không đưa nút “chơi Campuchia” vào menu trước khi sân đó chơi được và audio không gọi nhầm đội.

## Lộ trình và tiêu chí chấp nhận

1. **Lõi hiện tại:** thấy trọn cảnh, chạm lái có đổi hướng nhìn thấy, không vướng contact, hiểu lý do được thêm tốc độ. Đợt này triển khai và kiểm tra phần này.
2. **Mẫu sân Phnom Penh:** bảng ảnh có nguồn cho hai bờ/mốc chính, một cặp ghe đúng hạng, đường đua đo được; chạy trọn lượt bằng cùng engine. Chưa làm toàn bộ danh sách đăng ký khi chưa có căn cứ.
3. **Giải Campuchia:** nhập danh tính có ID riêng theo năm/hạng, luật vòng đấu chính xác, audio riêng; không trộn đội cùng tên hoặc hạng nam/nữ.
4. **Hành trình lễ hội:** đề xuất sau khi hai sân đã tốt — ghé Sóc Trăng rồi Phnom Penh, ghi thành tích theo sân, thử thách ngắn và mở phối màu bằng hoàn thành thử thách. Chưa triển khai tiền tệ, nâng chỉ số đội thật hay multiplayer.
5. **Siem Reap:** bộ tư liệu và sân riêng theo cùng quy trình; không chỉ đổi mái nhà/biển quảng cáo của Phnom Penh.

Kiểm tra máy chỉ chứng minh chức năng và độ ổn định, không chứng minh game đã hấp dẫn với người thật. Cần thử người chơi ở lượt đầu: có tự hiểu phải chèo/lái không, có nhận ra luồng sáng có ích không, có muốn đua lại để cải thiện không. Đo trên tablet thật mới kết luận được độ mượt và cảm giác điều khiển. Giữ nhịp trò chơi dễ vào, rồi tăng thử thách bằng đường nước và AI; không tăng độ khó bằng nút khó bấm hoặc che cảnh.
