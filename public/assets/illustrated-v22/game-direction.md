# Hướng phát triển thống nhất — Đua ghe Ngo 2.5D

## Quyết định hiện tại

Phiên bản đang phát triển chính dùng **2.5D minh họa sáng**, lấy bộ PNG đã được duyệt làm cơ sở. Một renderer Canvas, một bộ asset và một cấu hình cảnh dùng chung cho các chế độ. Các thử nghiệm 3D và hồ sơ kỹ thuật được giữ để tham khảo, không tiếp tục tạo thêm các phong cách song song trong luồng chính.

Trang chính `https://machxanht.github.io/Tuk-Ngo/` mở phiên bản này. Link test cũ `/assets/illustrated-v22/` vẫn dẫn đến cùng bản. Các URL có tham số `demo` rõ ràng của bản cũ tiếp tục dùng được; `demo=2d` mở bản chính.

## Phong cách và góc nhìn

- Minh họa mềm, nét người/ghe rõ, chất liệu có chi tiết vừa đủ; ánh sáng ban ngày và màu tự nhiên.
- Góc nhìn chính cố định từ bờ gần, hơi từ trên xuống; khung cảnh tỷ lệ 16:10. Không đổi sang camera trên đầu, camera sau lưng hoặc camera quay tự do giữa các chế độ.
- Mũi ghe hướng **sang trái**; chiều thi đấu quy ước **từ phải sang trái**. Bờ xa là bờ phải theo chiều đua và đặt khán đài chính; bờ gần là bờ đối diện.
- Người, cây, nhà và xe dùng cùng hệ tỷ lệ theo lớp gần/xa. Cùng một ghe trên hai làn chỉ chênh nhẹ do phối cảnh, không thu nhỏ làn xa quá mức.
- Cận ghe là công cụ trong Xưởng, giữ nguyên góc asset; không phải một phong cách hay chế độ thi đấu khác.

Góc nhìn này ưu tiên thấy rõ nhịp chèo, đầu/đuôi ghe, hoa văn và cả hai bờ. Khi làm đua thật, camera chỉ dịch dọc sông theo ghe, giữ nguyên hướng và độ nghiêng. Hiện bản Đua thử vẫn là cảnh kiểm tra nhịp/asset tại một khung sân, chưa mô phỏng hành trình 1.200 m hay camera bám ghe.

## Các chế độ

| Mục | Mục đích | Hiện trạng |
|---|---|---|
| Tập chèo | Một ghe, học nhịp vào nước và thao tác chạm | Có mẫu chấm độ đúng nhịp, đếm lượt chèo; chưa có sức bền/huấn luyện đầy đủ |
| Đua nhanh | Hai ghe, một trận, thao tác nhịp và nước rút | Nền cảnh hai ghe và animation đã có trong Đua thử; luật thắng/thua, quãng đường và đối thủ chưa hoàn thiện |
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

- Bản `hull-slim-bow-v23.png` thay bản mũi lớn: đầu gọn, cong liền thân, giữ chiều dài và hướng ghe. PNG cũ được giữ làm đối chiếu.
- Biên chế mẫu: 8 cặp ngồi phía trước, 17 cặp đứng phía sau, một người đầu ghe, một người điều khiển giữa, ba người lái cuối ghe.
- Điểm ngồi/đứng bám theo mép và đáy ghe. Lớp thành ghe che chân bên trong; dằm gần nằm ở lớp trước thành ghe để thấy vào nước.
- Không bóp nhỏ cả ghe để chữa mũi quá lớn. Sửa silhouette đầu ghe trong nguồn ảnh, sau đó kiểm tra lại điểm neo người và dằm.
- Hiện có bốn hình chèo và hai tư thế cổ vũ. Bước hoàn thiện tiếp là tăng số khung phù hợp hoặc rig các phần vẽ, sau khi silhouette và điểm neo đã ổn; không coi bốn hình hiện tại là animation cuối cùng.

## Nơi sửa và quy trình

| File | Vai trò |
|---|---|
| `scene-config.js` | Hướng mỹ thuật, camera, chế độ, vị trí làn, mép ghe, biên chế, vùng bờ/đường và các vị trí chính |
| `festival-scene.js` | Ghép lớp môi trường, NPC, quán và xe theo cấu hình |
| `preview.js` | Vẽ ghe/người/dằm, trạng thái chế độ, vòng animation và bài tập nhịp cơ bản |
| `festival-atlas.json` | Vùng lấy sprite và điểm neo đo từ PNG |
| `entry-route.js` | Đưa trang chính về phiên bản thống nhất, giữ URL tham khảo có `demo` rõ ràng |
| `game-direction.md` | Quy chuẩn phát triển này, cập nhật khi có quyết định mới |

Tạo asset mới phải theo cùng style và góc nhìn, lưu nguồn/prompts, ghép qua cấu hình, kiểm tra trực tiếp hình động và các điểm tiếp xúc, rồi chạy kiểm tra trên khung tablet trước khi xuất bản tại cùng link.

Chưa hoàn thành: đối thủ và kết quả đua thật, sức bền, giải đấu, trang phục/kbach từng đội được xác minh đầy đủ, tiếng cổ vũ và animation nhiều khung. Chưa đo hiệu năng trên tablet thật. Chốt hướng phát triển không có nghĩa các phần này đã được triển khai.
