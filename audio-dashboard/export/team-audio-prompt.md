# Prompt giao Antigravity: đối chiếu tên đội và lấy audio Việt–Khmer

Làm việc trong `E:/AI/Um Tuk/audio/antigravity`. Repo tham chiếu: `E:/AI/Um Tuk/github-workspace`.

Nhiệm vụ: rà soát đủ 61 đăng ký ghe trong roster 2025 đang dùng cho game, đối chiếu tên Việt–Khmer với nguồn và nội dung thu thực tế; xuất bộ audio tên đội đúng danh tính. Ưu tiên sửa nhầm đội/ngôn ngữ trước khi làm thêm bình luận. Chủ động tìm nguồn, dùng công cụ có sẵn hoặc miễn phí và xử lý theo lô. Không chỉ đổi tên file rồi báo hoàn thành.

## 1. Đọc dữ liệu trước

- `team-reference.json`: bảng đối chiếu chính, mỗi `registrationId` là một đăng ký riêng.
- `team-reference.csv` và `team-reference.md`: cùng dữ liệu, để rà thủ công.
- `roster.json`, `docs/roster.md`: nguồn đăng ký và giới hạn nghiên cứu.
- `docs/team-name-candidates.json`: chữ Khmer chuẩn bị trước, **chỉ là ứng viên tìm kiếm, chưa xác nhận**.
- `manifest.json`, `team-names/manifest.json`, `team-names/khmer.json`, `docs/team-name-audio.json`, `docs/khmer-team-audio.json`: audio và ánh xạ hiện có; đối chiếu SHA-256.
- `ANTIGRAVITY.md`, `script.json`, `requests.json`: quy tắc audio và tình huống game.

Hiện có 61 đăng ký; 45 tên chùa Khmer có nguồn báo địa phương, 10 có nguồn danh bạ cộng đồng, 6 chưa xác minh. Đây là mức chứng cứ **tên chùa**, chưa phải 61 tên đội đầy đủ đã chứng nhận. Có 49 nam, 7 nữ ghi rõ và 5 chưa rõ giới tính trong nguồn từng dòng. Không ép thành 53/8 bằng suy đoán. `sourceOrdinal` và số đầu tên MP3 không phải số báo danh. Năm trình bày game 2026 không biến roster 2025 thành danh sách đăng ký 2026.

Giữ nguyên tên tiếng Việt trong nguồn và `registrationId`. Phân biệt tên chùa ngắn, tên Pali đầy đủ, tên dân gian, đội 1/2, nam/nữ và địa phương. Không tự đổi chữ Khmer theo cách phát âm tiếng Việt. Cột `nameKmDisplayAuthored` chỉ ghép tên chùa với số đội để hiển thị; không dùng nó làm bằng chứng chữ khắc trên ghe.

## 2. Chốt tên và quan hệ đồng danh

Rà tất cả 61 dòng, ưu tiên 6 dòng `khmerBaseName=null`, nguồn cộng đồng, các mục `reviewFlags` và nhóm `samePagodaRegistrationIds`.

Nguồn ưu tiên: danh sách ban tổ chức, bảng tên/bảng kết quả trong video chính thức, chữ trên ghe hoặc bảng chùa nhìn rõ, bài báo Khmer có địa phương khớp, kênh chính thức của chùa. Danh bạ cộng đồng là chứng cứ bổ sung; giữ đúng cấp nguồn. Dùng từng `khmerSourceUrl` và `registrationSourceUrl` có sẵn. Nếu trang lỗi, ghi lỗi và tìm bản lưu hay nguồn khác; không ghi là đã đọc thành công. Ghi URL, ngày/năm sự kiện, timestamp hoặc vị trí bài, đoạn chữ ngắn làm chứng cứ và cách nối đúng chùa với đúng địa phương.

Các tên Khmer chuẩn bị trước có thể là tên Pali khác tên dân gian, biến thể chính tả, hoặc sai hoàn toàn. So sánh để tìm nguồn, không mặc nhiên sửa theo ứng viên hoặc mặc nhiên coi mọi khác biệt là sai. Chuẩn hóa khoảng trắng/Unicode chỉ hỗ trợ tìm kiếm; giữ nguyên chữ gốc và không xóa dấu phân biệt nghĩa. Chưa đủ nguồn thì `needs-review` hoặc `unresolved`, để trống tên chuẩn đã xác nhận.

## 3. Tìm đoạn có tên và chép lời thực tế

Kiểm tra audio có sẵn trước khi tải hay tổng hợp lại. `media/` chứa MP3 bàn giao; đường dẫn gốc nằm trong `sourceFile`. Có thể tìm audio dài, CC và báo cáo đã tải trong `E:/AI/Um Tuk/asset-studio/audio-references`, nhưng không đọc/in key hoặc đưa thông tin tài khoản vào bộ xuất.

Nguồn trực tiếp khởi đầu:

- https://www.youtube.com/watch?v=crZF3hghbgQ — giải 2025.
- https://www.youtube.com/watch?v=XagC29Eyt_U — khai mạc 2025.
- https://www.youtube.com/watch?v=Y2fp9gYRIZ8 — giải 2024.
- https://www.youtube.com/watch?v=tnb7TdUVRkU — giải 2023.

Tra thêm nguồn chính thức khi thiếu. Dùng CC có sẵn để tìm vị trí, sau đó chạy ASR trên audio gốc có ngữ cảnh. Nhận diện ngôn ngữ theo đoạn, tách người nói khi khả thi; không ép cả clip sang tiếng Việt hoặc dịch Khmer thành Việt rồi coi là transcript Khmer. Chọn ASR thực sự hỗ trợ Việt/Khmer, kiểm tra tài liệu và khả năng xử lý địa phương trước khi chạy hàng loạt. Nếu mô hình không hỗ trợ Khmer hoặc chất lượng kém, đổi công cụ, dùng CC phù hợp hoặc ghi hạn chế; không dựng transcript giả. Chỉ tải model một lần và lưu kết quả theo hash để tránh xử lý lặp.

Lưu **ASR nguyên bản không mớm danh sách tên** riêng với bản chỉnh sau đối chiếu. CC tự động, bản dịch tự động, forced alignment và ASR có prompt tên không phải bằng chứng độc lập xác nhận tên đúng. Tìm kiếm bằng tên/alias được phép; điểm khớp chỉ xếp hạng ứng viên. Nghe đoạn audio và xem ngữ cảnh trước/sau khoảng 10–20 giây, tên trên màn hình, cặp đấu, số đội và giới tính. Không lấy tên đội đối thủ nằm ngay câu kế bên. Nếu chưa nghe/hiểu chắc tiếng Khmer, ghi `nativeListeningVerified=false`; không nâng trạng thái chỉ vì máy nhận dạng trả đúng chữ mong muốn.

Một câu chỉ gọi tên chùa không tự xác định được đội 1/2 hoặc nam/nữ. Đặt `scope=pagoda-name` và lưu nhóm đăng ký có thể cùng chùa; chưa có bằng chứng thì `resolvedRegistrationId=null`. Chỉ gán `scope=registration-name` cho một đội khi số đội/giới tính/ngữ cảnh giải đủ phân biệt. Không nhân lịch sử hoặc kết quả của một đăng ký sang đăng ký khác.

## 4. Chọn và cắt audio

- Tiếng Việt: dùng bản thu gốc theo yêu cầu người dùng; không thay bằng TTS hay đổi giọng AI.
- Tiếng Khmer: ưu tiên bản gốc đúng nội dung. Khi thiếu, chỉ dùng giọng stock AI như Azure `km-KH-PisethNeural` sau khi tên đã được đối chiếu; ghi rõ nguồn AI. Đây không phải giọng clone BLV. Không tổng hợp tên Khmer chưa xác minh để lấp số lượng.
- Không nhập mù `E:/AI/Um Tuk/audio/output_audio/tieng_khmer`; file cũ có mẫu sai nội dung/ngôn ngữ so với nhãn. Có thể kiểm tra từng file như ứng viên cách ly.
- Cắt đủ từ/cụm tên, không mất phụ âm đầu/cuối, không kèm tên đội khác hoặc kết quả không liên quan. Giữ một ít không khí đầu/cuối, fade ngắn tránh click. Lưu audio gốc và mốc cắt, chỉ giảm ồn khi cần và nghe lại để bảo toàn âm tiết. Không ghép âm tiết rời thành tên mới rồi gọi đó là bản thu nguyên vẹn.
- Không dùng clip có từ chỉ thắng/thua/vô địch làm clip tên trung tính. Bình luận quá khứ cần năm, giải, hạng mục và nguồn riêng. Chỉ đối chiếu `script.json`/`requests.json` sau khi tên đã chốt; không gắn câu bình luận vào tình huống không tương ứng.

## 5. Xuất bộ bàn giao có thể kiểm toán

Xuất vào `E:/AI/Um Tuk/audio/antigravity/output/team-audio/`, không sửa/xóa nguồn và không ghi đè đầu ra khác nếu chưa đọc nội dung. Cập nhật file canonical tại chỗ; không sinh hậu tố phiên bản.

1. `team-names-reviewed.json` và `team-names-reviewed.csv`: đủ 61 dòng, tên Việt nguyên nguồn, tên chùa Khmer, tên đội Khmer đầy đủ nếu đã xác minh, alias kèm nguồn, số đội, giới tính, URL chứng cứ, trạng thái `verified`/`needs-review`/`unresolved` cùng lý do. Tách xác nhận tên với xác nhận nội dung audio.
2. `audio-audit.json` và `audio-audit.csv`: mọi ứng viên đã kiểm tra, gồm `clipId`, `language`, `sourceType`, `sourceUrl`, `sourceFile`, `sourceSha256`, `eventYear`, `sourceStart`, `sourceEnd`, `contextStart`, `contextEnd`, `ccRaw`, `asrRaw`, `asrModel`, `asrLanguage`, `asrPrompt`, `transcriptReviewed`, `matchedAlias`, `scope`, `candidateRegistrationIds`, `resolvedRegistrationId`, `numberEvidence`, `genderEvidence`, `identityEvidence`, `decision`, `reason`, `nativeListeningVerified`, `outputFile`, `sha256`. Tách `accepted`, `needs-review`, `rejected`; không tự tăng điểm tin cậy thành bằng chứng.
3. `audio/vi/` và `audio/km/`: chỉ file đã đủ điều kiện nhận. Tên file theo ID ổn định, ví dụ `can_tho-02-name.mp3`. Tên chùa chưa phân biệt đội để ở nhóm chùa riêng, không giả gán ID đăng ký. AI ghi thêm voice, text, request hash và provenance. Lưu ứng viên chưa đạt bên ngoài thư mục accepted.
4. `manifest.json`: schema, reference hash, ánh xạ tên theo `registrationId`/scope, đường dẫn tương đối, duration, sample rate, số kênh, bytes, SHA-256, transcript thật, nguồn và các cờ kiểm duyệt riêng. Thiếu audio thì mảng rỗng, không trỏ nhầm file khác.
5. `review.md`: số tên có nguồn theo từng cấp, số audio đã nghe/đối chiếu đúng, các trường hợp dễ nhầm, đội còn thiếu, giới hạn ASR và việc cần người thạo Khmer duyệt. Ghi rõ nội dung nào là lời gốc và nội dung nào là AI. Chuẩn bị preview để nghe từng tên cạnh tên chuẩn và nguồn.

Trước khi báo xong: kiểm tra đủ 61 ID không trùng, tách đội 1/2 và nam/nữ; kiểm tra mọi SHA-256 và đường dẫn; giải mã mọi MP3, không có file rỗng/clipping; nghe thực tế từng clip định nhận, đặc biệt toàn bộ tên Khmer. Đối chiếu số liệu báo cáo với manifest. Không gọi một clip “đã xác minh phát âm bản địa” nếu chỉ kiểm tra bằng ASR/TTS. Không công bố thiếu bằng chứng thành hoàn tất 100%.

Phạm vi lần này là dữ liệu tên và audio bàn giao. Giữ nguyên gameplay, asset, roster gốc và manifest runtime của game; không tự deploy hay nhập vào game. Không hỏi lại những thông tin đã có trong tài liệu; tự tiếp tục các mục không bị chặn và báo rõ mục chưa thể xác minh.
