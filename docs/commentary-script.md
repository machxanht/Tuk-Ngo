# Kịch bản bình luận thử Việt–Khmer

Nguồn biên soạn duy nhất: `public/assets/race-audio/commentary-script.json`.
Tài liệu này được xuất bằng `python scripts/build-commentary-trial.py --write-doc`.

Có 20 tình huống, 40 câu Việt–Khmer. Đây là kịch bản mới, không phải lời chép nguyên văn của hai BLV.
Đã xuất 40 mẫu giọng stock qua Azure Speech REST API. Chưa nhân bản hai BLV. Bản Khmer là bản nháp chờ người rành tiếng thẩm định, gồm cả tên riêng và cách đọc số.

## Cách diễn đạt và thứ tự

- Ngắn, rõ, có lực; nhường khoảng cho trống và tiếng nước.
- Bình tĩnh hơn, giải thích diễn biến; chỉ kể lịch sử trong khoảng trống.
- Câu ngắn, dồn nhịp theo cú đạp thật; không hét liên tục.
- Đọc kết quả đã xác nhận; chỉ gọi thắng lượt, không tự gọi vô địch.
- Luân phiên Việt–Khmer giữa các câu. Không phát cả hai bản của mọi câu; mỗi thời điểm chỉ một BLV nói.
- Kiểm tra lại trạng thái ngay trước khi phát; bỏ câu đã hết ngữ cảnh. Kết quả ưu tiên hơn lịch sử.

Thứ tự dưới đây là ví dụ có nhánh theo diễn biến, không phải timeline phát cứng:

1. `ready` / vi: Chuẩn bị, trống nhỏ.
2. `go` / km: Ngay lúc xuất phát; không đè tiếng Việt lên trên.
3. `intro-tum-nup` / vi: Khoảng trống sau xuất phát, chỉ với đúng đội mẫu.
4. `intro-kos-thum` / km: Chỉ với đúng đội mẫu; phát âm tên chưa được duyệt.
5. `cruise` / vi: Qua 200 m, trống về nhịp đường trường.
6. `history-tum-nup` / km: Chỉ khi không có pha vượt/tăng tốc; bản dịch còn nháp.
7. `halfway` / vi: Qua 600 m.
8. `close-race` / km: Nhánh tùy tình huống: chỉ khi chênh lệch dưới 2 m.
9. `final` / vi: Qua 950 m; tăng trống, tiếng nước và khán giả.
10. `surge` / km: Nhánh tùy tình huống: chỉ khi Đạp đang bật.
11. `last-fifty` / vi: Qua 1150 m; câu ngắn.
12. `finish-win` / km: Nhánh kết quả mẫu thắng; thua/hòa/DNF dùng câu riêng.

## Lời bình và điều kiện

### Chuẩn bị (`ready`)

- Việt: Chuẩn bị!
- Khmer (nháp): ត្រៀមខ្លួន!
- Khi phát: Trong 3 giây đếm ngược; chỉ chọn một ngôn ngữ.
- Thời lượng tối đa mỗi câu: 2.5 giây; tốc độ SSML thử: +0%.
- Đối chiếu: [broadcast-start](https://www.youtube.com/watch?v=crZF3hghbgQ&t=3345s). Original CC/context, not independent listening.

### Xuất phát (`go`)

- Việt: Xuất phát!
- Khmer (nháp): ចាប់ផ្តើមហើយ!
- Khi phát: Vừa hết đếm ngược, không đọc lại sau 3 giây.
- Thời lượng tối đa mỗi câu: 2.5 giây; tốc độ SSML thử: +8%.
- Đối chiếu: [broadcast-start](https://www.youtube.com/watch?v=crZF3hghbgQ&t=3345s). Original CC/context, not independent listening.

### Giới thiệu Tum Núp 2 (`intro-tum-nup`)

- Việt: Đội ghe Tum Núp 2.
- Khmer (nháp): ក្រុមទូកទំនប់ ២។
- Khi phát: Chỉ khi đăng ký nam Tum Núp 2 có mặt; không suy tên đội từ màu áo.
- Thời lượng tối đa mỗi câu: 5 giây; tốc độ SSML thử: +0%.

### Giới thiệu Kos Thum 1 (`intro-kos-thum`)

- Việt: Đội ghe Kos Thum 1.
- Khmer (nháp): ក្រុមទូកកោះធំ ១។
- Khi phát: Chỉ khi đăng ký nam Kos Thum 1 có mặt; không dùng cho đội nữ cùng chùa.
- Thời lượng tối đa mỗi câu: 5 giây; tốc độ SSML thử: +0%.

### Vào đường trường (`cruise`)

- Việt: Bước vào đường trường. Giữ đều nhịp dầm!
- Khmer (nháp): ឥឡូវត្រូវរក្សាចង្វាក់អុំឱ្យស្មើគ្នា។
- Khi phát: Ghe đang theo dõi qua 200 m, chưa tới 600 m.
- Thời lượng tối đa mỗi câu: 6 giây; tốc độ SSML thử: +0%.
- Đối chiếu: [broadcast-rhythm](https://www.youtube.com/watch?v=crZF3hghbgQ&t=5364s). Original CC/context, not independent listening.

### Qua nửa đường (`halfway`)

- Việt: Đã qua nửa đường đua. Còn sức cho đoạn cuối!
- Khmer (nháp): បានឆ្លងកាត់ពាក់កណ្តាលផ្លូវហើយ។ ត្រូវទុកកម្លាំងសម្រាប់ចុងផ្លូវ!
- Khi phát: Ghe đang theo dõi qua 600 m; không lấy vị trí ghe đối thủ làm mốc.
- Thời lượng tối đa mỗi câu: 6 giây; tốc độ SSML thử: +0%.

### Hai ghe so kè (`close-race`)

- Việt: Hai ghe đang so kè! Chưa có cách biệt rõ ràng!
- Khmer (nháp): ទូកទាំងពីរកំពុងប្រកៀកប្រកិតគ្នា!
- Khi phát: Chênh lệch tối đa 2 m; bỏ câu nếu khoảng cách tăng trong lúc chờ.
- Thời lượng tối đa mỗi câu: 5 giây; tốc độ SSML thử: +4%.
- Đối chiếu: [broadcast-close](https://www.youtube.com/watch?v=Y2fp9gYRIZ8&t=3673s). Original CC/context, not independent listening.

### Đổi dẫn đầu (`lead-change`)

- Việt: Vừa có pha vượt lên! Ngôi dẫn đầu đã đổi!
- Khmer (nháp): មានការវ៉ាឡើងមុខ! ទូកនាំមុខបានផ្លាស់ប្តូរហើយ!
- Khi phát: Có đổi ngôi thật, cách trên 3 m; câu bị hủy nếu ngôi dẫn đầu đổi tiếp.
- Thời lượng tối đa mỗi câu: 5 giây; tốc độ SSML thử: +5%.
- Đối chiếu: [broadcast-close](https://www.youtube.com/watch?v=Y2fp9gYRIZ8&t=3673s). Original CC/context, not independent listening.

### Đều nhịp thật (`cohesion`)

- Việt: Nhịp dầm đang rất đều! Cả đội phối hợp nhịp nhàng!
- Khmer (nháp): ចង្វាក់អុំស្មើគ្នាល្អណាស់!
- Khi phát: Ít nhất 30 nhịp đúng liên tục; không khen đều khi đang BAD/lỡ nhịp.
- Thời lượng tối đa mỗi câu: 5 giây; tốc độ SSML thử: +0%.
- Đối chiếu: [broadcast-rhythm](https://www.youtube.com/watch?v=crZF3hghbgQ&t=5364s). Original CC/context, not independent listening.

### Giảm nhịp giữ sức (`recover`)

- Việt: Giảm nhịp để giữ sức cho chặng cuối.
- Khmer (nháp): បន្ថយចង្វាក់ ដើម្បីទុកកម្លាំងសម្រាប់ចុងផ្លូវ។
- Khi phát: Người chơi thực sự chọn giữ sức ở đường trường.
- Thời lượng tối đa mỗi câu: 5 giây; tốc độ SSML thử: -4%.
- Đối chiếu: [broadcast-rhythm](https://www.youtube.com/watch?v=crZF3hghbgQ&t=5364s). Original CC/context, not independent listening.

### Lịch sử Tum Núp 2 (`history-tum-nup`)

- Việt: Năm 2024, Tum Núp 2 giành chức vô địch nội dung nam.
- Khmer (nháp): នៅឆ្នាំ ២០២៤ ក្រុមទូកទំនប់ ២ បានឈ្នះជើងឯកផ្នែកបុរស។
- Khi phát: Đội nam Tum Núp 2 có mặt, đường trường còn khoảng trống; ghi rõ năm 2024.
- Thời lượng tối đa mỗi câu: 9 giây; tốc độ SSML thử: -3%.
- Đối chiếu: [history-tum-nup](https://baosoctrang.org.vn/thoi-su/202411/doi-kos-thum-tinh-bac-lieu-va-doi-tum-nup-2-huyen-chau-thanh-vao-tran-chung-ket-giai-dua-ghe-ngo-nam-edc42ae/). 2024 male final participants; combine with official results.
- Đối chiếu: [history-results](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/). 2024 men's champion Tum Nup; runner-up Kos Thum.

### Lịch sử Kos Thum 1 (`history-kos-thum`)

- Việt: Kos Thum 1 là đội á quân nội dung nam năm 2024.
- Khmer (nháp): ក្រុមទូកកោះធំ ១ បានជាប់ចំណាត់ថ្នាក់លេខពីរ ផ្នែកបុរស នៅឆ្នាំ ២០២៤។
- Khi phát: Đội nam Kos Thum 1 có mặt; không dùng thành tích này cho đội nữ.
- Thời lượng tối đa mỗi câu: 9 giây; tốc độ SSML thử: -3%.
- Đối chiếu: [history-results](https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/). 2024 men's champion Tum Nup; runner-up Kos Thum.
- Đối chiếu: [history-kos-thum](https://baocamau.vn/bac-lieu-doat-2-giai-cao-tai-giai-dua-ghe-ngo-tinh-soc-trang-a119729.html). 2024 male runner-up; do not transfer to women's entry.

### Vào 250 m cuối (`final`)

- Việt: Vào đoạn nước rút! Tăng nhịp dầm!
- Khmer (nháp): ដល់ដំណាក់កាលចុងក្រោយហើយ! បង្កើនល្បឿន!
- Khi phát: 950–1100 m; đây là mốc nước rút trong game, không phải cự ly mọi giải thật. Không đọc số mét còn lại cố định khi audio phát trễ.
- Thời lượng tối đa mỗi câu: 5 giây; tốc độ SSML thử: +8%.
- Đối chiếu: [broadcast-final](https://www.youtube.com/watch?v=Y2fp9gYRIZ8&t=6025s). Original CC/context, not independent listening.
- Đối chiếu: [broadcast-khmer](https://www.youtube.com/watch?v=tnb7TdUVRkU&t=11054s). Original CC and bounded ASR; not certified native transcription.

### Đạp đang kích hoạt (`surge`)

- Việt: Đạp! Dồn hết sức!
- Khmer (nháp): ប្រឹងអស់កម្លាំង!
- Khi phát: Chỉ khi Đạp đang bật thật; bỏ ngay nếu hết hiệu lực trước khi phát.
- Thời lượng tối đa mỗi câu: 3 giây; tốc độ SSML thử: +12%.
- Đối chiếu: [broadcast-final](https://www.youtube.com/watch?v=Y2fp9gYRIZ8&t=6025s). Original CC/context, not independent listening.
- Đối chiếu: [broadcast-khmer](https://www.youtube.com/watch?v=tnb7TdUVRkU&t=11054s). Original CC and bounded ASR; not certified native transcription.

### 100 m cuối (`last-hundred`)

- Việt: Một trăm mét cuối!
- Khmer (nháp): ១០០ ម៉ែត្រចុងក្រោយ!
- Khi phát: 1100–1150 m; bỏ nếu ghe đã qua mốc 1150 m.
- Thời lượng tối đa mỗi câu: 3 giây; tốc độ SSML thử: +10%.

### 50 m cuối (`last-fifty`)

- Việt: Năm mươi mét cuối!
- Khmer (nháp): ៥០ ម៉ែត្រចុងក្រោយ!
- Khi phát: 1150–1200 m, chỉ một câu ngắn rồi nhường kết quả.
- Thời lượng tối đa mỗi câu: 3 giây; tốc độ SSML thử: +12%.

### Thắng lượt (`finish-win`)

- Việt: Đã về đích! Xin chúc mừng đội thắng lượt đua này!
- Khmer (nháp): ដល់ទីហើយ! សូមអបអរសាទរក្រុមដែលឈ្នះជើងប្រណាំងនេះ!
- Khi phát: Game đã xác nhận thắng lượt; không tuyên bố vô địch cả giải.
- Thời lượng tối đa mỗi câu: 6 giây; tốc độ SSML thử: +5%.

### Thua lượt (`finish-loss`)

- Việt: Rất tiếc! Đối thủ đã về đích trước trong lượt này.
- Khmer (nháp): គួរឱ្យសោកស្តាយ! គូប្រកួតបានដល់ទីមុន ក្នុងជើងប្រណាំងនេះ។
- Khi phát: Game xác nhận đối thủ về trước; không hẹn mùa sau vì có thể còn vòng đấu khác.
- Thời lượng tối đa mỗi câu: 6 giây; tốc độ SSML thử: -2%.

### Kết quả hòa (`finish-tie`)

- Việt: Kết quả hòa! Hai ghe kết thúc sát nhau!
- Khmer (nháp): លទ្ធផលស្មើគ្នា! ទូកទាំងពីរដល់ទីប្រកៀកប្រកិតគ្នា!
- Khi phát: Đã có kết quả hòa trong game; không phát câu đang chờ trọng tài.
- Thời lượng tối đa mỗi câu: 6 giây; tốc độ SSML thử: +0%.

### Không hoàn thành (`finish-dnf`)

- Việt: Rất tiếc, một đội đã không hoàn thành lượt đua.
- Khmer (nháp): គួរឱ្យសោកស្តាយ ក្រុមមួយមិនបានបញ្ចប់ជើងប្រណាំងនេះទេ។
- Khi phát: Game xác nhận không hoàn thành; không bịa tai nạn hay lý do bỏ cuộc.
- Thời lượng tối đa mỗi câu: 6 giây; tốc độ SSML thử: -4%.

## Tạo mẫu Azure trước, RVC sau

Chỉ dùng giọng stock `vi-VN-NamMinhNeural` và `km-KH-PisethNeural` để kiểm tra nội dung/cách đọc trước. Không gắn nhãn hai BLV thật cho mẫu Azure.
Các giọng này không có style thể thao được xác minh; tăng tốc SSML không chứng minh có cảm xúc bình luận trực tiếp.

Kế hoạch: 1391 ký tự lời đọc, tối đa 7857 ký tự nếu tính cả toàn bộ XML. Đây là ước lượng cho bộ mẫu, không phải số quota Azure còn lại.
Chạy không có `--synthesize` chỉ kiểm tra/xuất kế hoạch, không gọi mạng hay dùng quota.

```powershell
python scripts/build-commentary-trial.py --write-doc --out "E:/AI/Um Tuk/asset-studio/audio-references/commentary-trial/api"
python scripts/build-commentary-trial.py --synthesize --config "E:/AI/Um Tuk/asset-studio/audio-references/azure-speech.json" --out "E:/AI/Um Tuk/asset-studio/audio-references/commentary-trial/api"
python scripts/build-commentary-trial.py --publish --write-doc --out "path/to/completed-api-trial"
```

Cấu hình riêng nằm ngoài repo, gồm `key`, `region`, `tier: "F0"`; không đưa key vào chat, website hoặc Git. Cũng hỗ trợ `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_SPEECH_TIER` trong môi trường tiến trình.
Công cụ kiểm tra danh sách voice của resource, gửi từng câu qua REST, giới hạn khoảng 18 request/phút, lưu cache theo SHA của SSML và kiểm tra WAV mono 24 kHz/16 bit, tín hiệu khác 0, thời lượng. Không tự nâng gói hoặc gọi batch API. Không tự retry POST sau lỗi mạng để tránh nhân đôi lượt tính phí không xác định.
Nhãn F0 trong cấu hình là khai báo của người dùng; phải đối chiếu SKU/quota còn lại trên resource trước khi chạy. Script không có quyền ARM để chứng nhận SKU hay mức sử dụng toàn tài khoản.

RVC chưa được cài/huấn luyện trong thử nghiệm này. Bước tiếp theo cần hai bộ thu sạch, đúng một BLV mỗi bộ, quyền sử dụng/nhân bản giọng và hai model độc lập. Không dùng model nhận dạng Whisper thay cho model chuyển giọng. Chưa có bằng chứng cho phép của hai BLV.
Chỉ đưa vào runtime sau khi nghe duyệt nội dung, phát âm Khmer/tên riêng, cảm xúc và đối chiếu người nói. Kiểm tra kỹ thuật không chứng minh các tiêu chí nghe này.

Tài liệu kỹ thuật: [Azure REST TTS](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [Azure quotas](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits), [RVC chính thức](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI).
