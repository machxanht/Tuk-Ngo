# Hướng phát triển thống nhất — Đua ghe Ngo 2.5D

## Quyết định hiện tại

Phiên bản đang phát triển chính dùng **2.5D kết hợp**: ghe và VĐV là 3D có khung xương, trên cảnh hai bờ minh họa sáng đã được duyệt. Một luồng dựng cảnh và một cấu hình dùng chung cho đua tự động, tập chèo và kiểm tra VĐV. Không dùng bốn hình rời làm chuyển động VĐV nữa.

Trang chính `https://machxanht.github.io/Tuk-Ngo/` mở phiên bản này. Link test cũ `/assets/illustrated-v22/` vẫn dẫn đến cùng bản. Các URL có tham số `demo` rõ ràng của bản cũ tiếp tục dùng được; `demo=2d` mở bản chính.

## Phong cách và góc nhìn

- Minh họa mềm, nét người/ghe rõ, chất liệu có chi tiết vừa đủ; ánh sáng ban ngày và màu tự nhiên.
- Góc nhìn chính cố định từ bờ gần, hơi từ trên xuống; khung cảnh tỷ lệ 16:10. Không đổi sang camera trên đầu, camera sau lưng hoặc camera quay tự do giữa các chế độ.
- Mũi ghe hướng **sang trái**; chiều thi đấu quy ước **từ phải sang trái**. Bờ xa là bờ phải theo chiều đua và đặt khán đài chính; bờ gần là bờ đối diện.
- Người, cây, nhà và xe dùng cùng hệ tỷ lệ theo lớp gần/xa. Cùng một ghe trên hai làn chỉ chênh nhẹ do phối cảnh, không thu nhỏ làn xa quá mức.
- Cận ghe là công cụ trong Xưởng, giữ nguyên góc asset; không phải một phong cách hay chế độ thi đấu khác.

Góc nhìn này ưu tiên thấy rõ nhịp chèo, đầu/đuôi ghe, hoa văn và cả hai bờ. Demo Đua tự động có hai ghe di chuyển từ vạch xuất phát đến vạch đích, camera bám nhẹ và trở lại toàn cảnh khi kết thúc. Có thể chọn Toàn cảnh để giữ cả sân. Đoạn đua được thu gọn trong bố cục hiện tại để kiểm tra asset; chưa mô phỏng tuyến đo đạc 1.200 m.

## Các chế độ

| Mục | Mục đích | Hiện trạng |
|---|---|---|
| Tập chèo | Một ghe, học nhịp vào nước và thao tác chạm | Chạm sân hoặc bấm Chèo; có mẫu chấm độ đúng nhịp, đếm lượt chèo, dùng được khi toàn màn hình; chưa có sức bền/huấn luyện đầy đủ |
| Đua tự động / Đua nhanh | Hai ghe, một trận, nhịp chèo và nước rút | Demo tự chạy để kiểm tra asset; Đua nhanh điều khiển ghe xanh, đua với AI độc lập, chấm nhịp, sức bền, nước rút, ba độ khó, kết quả và đua lại |
| Giải đấu | Nhiều vòng với dữ liệu đội ghe đã xác minh | Phát triển sau; chưa đưa nút giả vào giao diện |
| Xưởng ghe/asset | Kiểm tra silhouette, tư thế, lớp che chân và file nguồn | Công cụ kiểm tra, không phải chế độ chơi |

Thứ tự làm tiếp là **Tập chèo → Đua nhanh → Giải đấu**. Tập chèo và Đua nhanh phải dùng cùng renderer, quy ước nhịp, mặt nước, camera và tỷ lệ nhân vật. Không làm một engine riêng cho mỗi mục.

## Quy tắc bố cục sân

1. Cảnh chia thành bờ xa, sông với hai làn và bờ gần. Ghe ở vùng sông; khán giả đứng trên phần bờ/promenade.
2. Từ sông vào bờ: hàng khán giả, khán đài/quán ở phần đất được dành riêng, lối đi bộ, đường xe, nhà cửa và cây. Chừa lối tiếp cận khán đài và đầu cầu.
3. Quán và chân khách nằm trên vỉa hè, trước ranh giới đường xe. Người đi bộ bám mép vỉa hè; xe đi giữa đường. Mật độ cao vẫn phải dành diện tích cho chân quán và hành lang lưu thông.
4. C247 và cầu 30/4 thuộc hai vị trí khác nhau của tuyến; không xếp cạnh nhau trong cùng khung. Cảnh hiện tại chỉ thấy một phần cầu ở đầu tuyến, ngoài vùng hai ghe chính; cầu còn lại vẫn có asset để dùng ở đoạn tương ứng.
5. Nhà một, hai, ba tầng có chiều cao khác nhau tương ứng; không phóng quán một tầng bằng nhà ba tầng. Cây và người bán không được tùy tiện to hơn các nhân vật cùng lớp sâu.
6. Banner dùng font Khmer thật. Chữ phục vụ bối cảnh lễ hội, không ghi các thông số kỹ thuật của renderer vào sản phẩm.

Đây là bố cục nghệ thuật theo bối cảnh Maspero, chưa phải bản khảo sát từng nhà hoặc mặt đường. Các tỷ lệ ở `scene-config.js` là đơn vị hình vẽ, không phải tọa độ đo đạc.

## Ghe và chuyển động

- Giữ hình học ghe 3D đã được chấp nhận; hoa văn lấy từ bản vẽ `hull-slim-bow-v23.webp`, ánh sáng và vật liệu theo bảng màu sáng. PNG được giữ làm nguồn màu/hoa văn.
- Biên chế mẫu: 8 cặp ngồi phía trước, 17 cặp đứng phía sau, một người đầu ghe, một người điều khiển giữa, ba người lái cuối ghe.
- VĐV ngồi/đứng trên điểm tựa trong lòng ghe; hai tay giữ đúng cán dằm. Thành ghe, chân và dằm có độ sâu 3D thật.
- Không bóp nhỏ cả ghe để chữa mũi quá lớn. Sửa silhouette đầu ghe trong nguồn ảnh, sau đó kiểm tra lại điểm neo người và dằm.
- VĐV dùng chu kỳ khung xương 97 mẫu với nội suy liên tục; người đầu ghe, điều khiển và lái có động tác riêng. Mười hai biến thể đầu/tông da được tạo từ một mesh gốc; hai ghe có màu áo riêng. Khán giả nền vẫn dùng hai tư thế cổ vũ, với chuyển động thân nhẹ và các thời điểm hò reo riêng; người đi bộ bốn pha. Khán giả chưa chuyển sang rig 3D.

## Nơi sửa và quy trình

| File | Vai trò |
|---|---|
| `scene-config.js` | Hướng mỹ thuật, camera, chế độ, vị trí làn, mép ghe, biên chế, vùng bờ/đường và các vị trí chính |
| `festival-scene.js` | Ghép lớp môi trường, NPC, quán và xe theo cấu hình |
| `preview.js` | Vẽ ghe/người/dằm, trạng thái chế độ, vòng animation và bài tập nhịp cơ bản |
| `src/race/hybrid-boats-v25.mjs` | Dựng ghe, VĐV có khung xương, màu, độ sâu và camera; được đóng gói thành `hybrid-boats-v25.js` |
| `src/race/gameplay.mjs` | Luật trận đua dùng chung với bản 3D cũ: nhịp, sức bền, AI và thời gian cán đích |
| `quick-race-v26.js` | Giao diện trận đua, kỷ lục trên trình duyệt và ánh xạ hai ghe vào cùng cảnh |
| `festival-atlas.json` | Vùng lấy sprite và điểm neo đo từ PNG |
| `entry-route.js` | Đưa trang chính về phiên bản thống nhất, giữ URL tham khảo có `demo` rõ ràng |
| `game-direction.md` | Quy chuẩn phát triển này, cập nhật khi có quyết định mới |

Tạo asset mới phải theo cùng style và góc nhìn, lưu nguồn/prompts, ghép qua cấu hình, kiểm tra trực tiếp hình động và các điểm tiếp xúc, rồi chạy kiểm tra trên khung tablet trước khi xuất bản tại cùng link.

Đua nhanh đã có điều khiển cả trận và sức bền, dùng cự ly gameplay 1.200 m trên bố cục sông thu gọn. Kỷ lục chỉ lưu trên trình duyệt hiện tại; chưa đồng bộ giữa thiết bị. Âm thanh dùng bản ghi khán giả CC0, không phải hô vang Khmer của giải Maspero. Bảng điều khiển nằm dưới cảnh hoặc bên cạnh trên màn hình ngang thấp; toàn màn hình vẫn có nút chèo và thanh nhịp. Chuyển khỏi trang tự tạm dừng trận đua.

Chưa hoàn thành: giải đấu nhiều vòng, trang phục/kbach từng đội được xác minh đầy đủ trong bản hybrid, rig chuyển động khán giả gần và các khuôn mặt được tạo hình riêng. Chưa đo hiệu năng trên tablet thật.
