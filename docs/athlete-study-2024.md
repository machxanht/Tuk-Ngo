# Một VĐV Tum Núp 2 — tư liệu thi đấu 2024

Yêu cầu: làm kỹ một VĐV, sửa trang phục và dằm bằng ảnh / video thật. Mẫu chi tiết được dựng riêng để xem trước khi thay đội hình. Ghe và gameplay V10 tiếp tục dùng đội hình V9.

## Tư liệu đã xem

| Nguồn thật | Chi tiết đối chiếu |
| --- | --- |
| [Thanh Niên — Duy Tân, 15/11/2024](https://thanhnien.vn/chua-tum-nup-doat-cu-dup-vo-dich-ghe-ngo-nam-va-nu-185241115184726094.htm), ảnh `anh-8-17316704637181943855127.jpg` | Ghe số 12; áo xanh không tay, viền xanh, chữ trắng trước ngực, nón trắng, chân trần. Dằm gỗ nâu, tay cầm ngang màu nhạt, băng xanh, bản dài đầu bo. |
| Cùng bài, ảnh `anh-11-17316705708801037472883.jpg` | Chữ trắng sau áo, có “GIA ĐẠT” và “TUM NÚP 2”; dáng ngồi và kiểu nón. |
| [Báo Sóc Trăng — video giải đấu 2024](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/), đoạn 104–107 giây | Ghe số 12 và VĐV áo xanh; trình tự đưa dằm, vào nước, kéo và hồi. Không lấy áo của đội khác trong cùng video làm trang phục Tum Núp 2. |

Ảnh/video là tư liệu tham khảo, không đóng gói thành texture hoặc âm thanh. Không dùng hình ChatGPT tạo ra để xác nhận trang phục, hình dáng hoặc động tác. Mẫu 2024 dùng **viền xanh, dằm gỗ nâu**; các mô tả khác màu trong hồ sơ cũ không xác nhận được bộ trang phục của năm này.

## Phần dựng mới

- Giữ chi tiết cơ thể, khuôn mặt và ngón tay của MakeHuman/MPFB CC0; dùng skin map CC0 với màu da được chỉnh cho mẫu. Đây là nhân vật chung, không phải quét 3D hoặc chân dung VĐV có tên.
- Áo có phần trước/sau nối qua vai, cổ và hai lỗ nách, viền, đường may, nếp gấp hình học. Có 49 hình hiệu chỉnh tiếp xúc vải theo tư thế, xuất thành morph targets GLB. Giữ đủ cơ thể sau cổ/vai để không lộ lỗ khi áo dịch chuyển.
- Quần tối màu có cạp liên tục; nón trắng sáu múi có đường may, nút và lưỡi trai cong phía sau. Chọn nón ngược theo một số người trong ảnh.
- Chữ trắng theo bố cục trước/sau nhìn thấy trong ảnh. Chưa sao chép chính xác mọi logo và dòng tài trợ nhỏ.
- Dằm có cán mảnh, băng xanh, tay cầm ngang màu nhạt, bản gỗ dài và mỏng, đầu bo. Dài 1,52 m, bản 0,48 × 0,158 m là **ước lượng từ ảnh**, không phải đo thực địa.
- Vòng chèo baked 49 khung hình, xuất thành một animation chứa cả người, vải và dằm để trình xem GLB thông thường phát cùng lúc. Giới hạn với cả hai điểm cầm ngăn tay bị kéo quá tầm; khuỷu giữ cùng phía thân; cổ tay theo mặt phẳng khuỷu. Đường hồi dằm nâng và đưa về trước. Đây là animation được dựng, không phải motion capture hoặc góc khớp đo từ video.

Blender thực sự tạo bề mặt áo, quần, nón, dằm và dữ liệu chuyển động trong `scripts/build-athlete-study.py`. Cơ thể/skin có nguồn ghi trong [attribution](../public/assets/human/ATTRIBUTION.md). Font Arial chỉ tạo hình học chữ; font không đóng gói trong nguồn Blender.

## File và cách xem

- `public/assets/human/athlete-rower-study.glb`: model có chuyển động.
- `assets/blender/athlete-rower-study.blend`: mesh, rig, morph và texture được đóng gói, có thể sửa tiếp.
- `?demo=art`: mặc định “Một VĐV mới”, góc trước / ngang / sau / dằm; kéo xoay, phóng to, dừng, kéo từng pha, tải GLB, chụp PNG và ghi WebM.
- “Ghe 3D hiện tại” giữ V9 để đối chiếu. Mẫu này chưa nhân thành 55 người hoặc thay gameplay.

Bản này được chuẩn bị trong checkout local. Push bằng credential hiện có bị GitHub trả HTTP 403 vì tài khoản không có quyền repo; GitHub CLI và trình duyệt trên máy hiện chưa đăng nhập tài khoản có quyền. GitHub Pages đang công khai **chưa có mẫu mới**. Khi có quyền xuất bản, cập nhật cùng `?demo=art`, không tạo trang riêng cho từng lần sửa.

## Dựng lại và bằng chứng

Trên PC đã có Blender portable ở `../tools/blender/blender-5.2.2-windows-x64/`, từ repo chạy:

```powershell
powershell -NoProfile -File scripts/build-athlete-study.ps1 -Render
npm run lint
npm run build
```

Script kiểm tra cache skin CC0, dựng mesh/motion trong Blender, xuất GLB, lưu nguồn, render năm góc/pha và kiểm tra GLB đã lưu. Không cần Adobe, tài khoản AI tạo model hoặc gói trả phí. Blender dùng NumPy đi kèm; Python ngoài Blender chỉ tải/kiểm tra cache.

`docs/qa/athlete-study/` giữ render thật, build report, kiểm tra rig và browser. Rig được lấy mẫu 193 pha từ GLB với tất cả clip: điểm cầm, góc khuỷu/cổ tay, bước quay, nối vòng và đủ morph áo. Validator phải có 0 lỗi; cảnh báo node skin có parent được ghi riêng. Kiểm tra tâm bàn tay không thay thế kiểm tra toàn bộ bề mặt ngón tay.

Ảnh/clip browser phải xem trực tiếp để đánh giá áo và dằm. Viewport 1024 × 768 và 768 × 1024 kiểm tra bố cục, không phải benchmark tablet thật. File một người giữ nhiều chi tiết; cần giảm chi tiết riêng trước khi nhân cả ghe. Mức hiện tại vẫn là asset game được dựng theo tư liệu, chưa phải bản quét người thật.
