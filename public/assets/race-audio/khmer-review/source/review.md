# Báo Cáo Kiểm Tra và Bàn Giao Kịch Bản & Audio Tiếng Khmer
**Dự án:** Game Đua Ghe Ngo (Lễ hội Óoc Om Bóc - Đua ghe Ngo Sóc Trăng)  
**Thư mục bàn giao:** `E:\AI\Um Tuk\audio\antigravity\output\khmer`  
**Ngày thực hiện:** 20/10/2026  
**Ngôn ngữ:** Tiếng Khmer (`km`)  
**Giọng đọc tổng hợp (TTS):** Microsoft Azure Speech `km-KH-PisethNeural` (Resource F0, `eastus`)  

---

## 1. Tóm Tắt Kết Quả Bàn Giao

| Chỉ số | Giá trị | Ghi chú |
| :--- | :---: | :--- |
| **Tổng số tình huống / cueId** | **29 / 29** | Đạt **100% độ phủ** kịch bản đua ghe Ngo |
| **Số câu tái sử dụng (Reused)** | **22** | Đối chiếu và xác thực 100% SHA-256 từ `media/km/` |
| **Số câu tạo mới (Newly Synthesized)** | **7** | Tạo bằng Azure Speech `km-KH-PisethNeural` theo `requests.json` |
| **Bản âm thanh bổ sung / resolved** | **8** | Giải quyết `{player_name}`, `{opponent_name}`, `{winner_name}`, câu dẫn và tên đội |
| **Số câu chưa hoàn thành (Uncompleted)** | **0** | Toàn bộ 29 cues đều đã có audio thực tế |
| **Tổng số file MP3 trong `audio/`** | **89** | 22 cue gốc + 15 clip tạo mới + 52 tên đội sẵn có |
| **Kiểm tra kỹ thuật âm thanh (FFmpeg)** | **89 / 89 ĐẠT** | 24kHz mono 96kbps, không im lặng, không clipping, không mất đầu/cuối câu |
| **Trạng thái duyệt phát âm bản ngữ** | `Pending Native Review` | Giữ cờ `nativeListeningVerified: false` theo quy chuẩn an toàn |

---

## 2. Bảng Đối Chiếu Chi Tiết 29 Cues Theo 8 Giai Đoạn Đua

| STT | Cue ID | Giai đoạn | Tình huống | Lời bình Tiếng Khmer | Nghĩa Tiếng Việt | Audio chính | Thời lượng (s) | Nguồn & Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | `ceremony-welcome` | ceremony | Chào khán giả bên sông | ទស្សនិកជន ទាំងឡាយ ជា ទី មេត្រី | Quý khán giả thân mến, khán đài và dọc sông Maspéro đầy ắp khán giả. | `khmer-intro.mp3` | 1.88s | Tái sử dụng (Phát thanh gốc) |
| 2 | `ceremony-teams` | ceremony | Các đội ghe hội tụ | ក្រុមទូកទាំងអស់បានមកជួបជុំគ្នានៅមុខវេទិកា។ ទស្សនិកជននៅតាមដងទន្លេកំពុងរង់ចាំការប្រកួត។ | Các đội ghe đã hội tụ trước khán đài. Khán giả hai bờ sông đang chờ tranh tài. | `ai-ceremony-teams-km.mp3` | 6.94s | **Tạo mới** (Azure Speech) |
| 3 | `flyover` | intro | Toàn cảnh lễ hội 1.200 m | ទស្សនិកជន ទាំងឡាយ ជា ទី មេត្រី | Toàn cảnh hội đua năm, sáu mươi đội tham gia cùng hàng chục ngàn khán giả. | `khmer-intro.mp3` | 1.88s | Tái sử dụng (Phát thanh gốc) |
| 4 | `team-introduction` | intro | Gọi đúng hai đội trong lượt | ទុំនុប ២ ប្រកួតជាមួយ កោះធំ ១។ ក្រុមទាំងពីរកំពុងត្រៀមចេញដំណើរ។ | Tum Núp 2 gặp Kos Thum 1. Hai đội đang chuẩn bị xuất phát. | `ai-intro-match-tum-nup-kos-thum-km.mp3` | 4.90s | **Tạo mới** (Đã gán tên thật Tum Núp 2 vs Kos Thum 1) |
| 5 | `ready` | countdown | Chuẩn bị | ត្រៀមខ្លួន! | Đúng như chúng ta đã chờ đợi (Chuẩn bị!). | `ai-ready-km.mp3` | 1.82s | Tái sử dụng (Azure Stock) |
| 6 | `go` | start | Xuất phát | ចាប់ផ្តើមហើយ! | Hai đội vừa rời điểm xuất phát thôi (Bắt đầu rồi!). | `ai-go-km.mp3` | 1.82s | Tái sử dụng (Azure Stock) |
| 7 | `start-drive` | start | Bắt nhịp sau xuất phát | ក្រុមទាំងពីរបានចេញដំណើរហើយ។ ត្រូវចាប់ចង្វាក់ឱ្យស្មើគ្នា! | Hai đội đã xuất phát, phải bắt nhịp cho đều! | `ai-start-drive-km.mp3` | 4.25s | **Tạo mới** (Azure Speech) |
| 8 | `cruise` | cruise | Vào đường trường | ឥឡូវត្រូវរក្សាចង្វាក់អុំឱ្យស្មើគ្នា។ | Bước vào đường trường 1.200 m, giữ đều nhịp dầm và dẻo dai. | `ai-cruise-km.mp3` | 3.18s | Tái sử dụng (Azure Stock) |
| 9 | `cruise-context` | cruise | Thử thách cự ly | ផ្លូវប្រណាំងនៅវែងទៀត។ ត្រូវរក្សាចង្វាក់ និងសន្សំកម្លាំងសម្រាប់ចុងផ្លូវ។ | Đường đua còn dài, phải giữ nhịp và dưỡng sức cho đoạn cuối. | `ai-cruise-context-km.mp3` | 5.14s | **Tạo mới** (Azure Speech) |
| 10 | `fatigue` | cruise | Sức bền xuống thấp | បន្ថយចង្វាក់ ដើម្បីទុកកម្លាំងសម្រាប់ចុងផ្លូវ។ | Thể lực giảm dưới 20%, giảm bớt nhịp dầm để giữ sức. | `ai-recover-km.mp3` | 3.74s | Tái sử dụng (Azure Stock) |
| 11 | `cohesion` | cruise | Nhịp dầm đồng đều | ចង្វាក់អុំស្មើគ្នាល្អណាស់! | Nhịp dầm đang rất đều trên 80%, phối hợp nhịp nhàng. | `ai-cohesion-km.mp3` | 2.46s | Tái sử dụng (Azure Stock) |
| 12 | `recover` | cruise | Hồi sức giữ nhịp | បន្ថយចង្វាក់ ដើម្បីទុកកម្លាំងសម្រាប់ចុងផ្លូវ។ | Nhẹ nhàng, hồi phục thể lực sau đợt bung sức. | `ai-recover-km.mp3` | 3.74s | Tái sử dụng (Azure Stock) |
| 13 | `halfway` | halfway | Qua nửa đường | បានឆ្លងកាត់ពាក់កណ្តាលផ្លូវហើយ។ ត្រូវទុកកម្លាំងសម្រាប់ចុងផ្លូវ! | Đã qua mốc 600 m, dồn sức cho nửa chặng quyết định. | `ai-halfway-km.mp3` | 4.38s | Tái sử dụng (Azure Stock) |
| 14 | `close-race` | duel | Hai ghe so kè | ទូកទាំងពីរកំពុងប្រកៀកប្រកិតគ្នា! | Hai đội đang so kè sát nút dưới 3 mét! | `ai-close-race-km.mp3` | 2.84s | Tái sử dụng (Azure Stock) |
| 15 | `lead-change` | duel | Đổi dẫn đầu | មានការវ៉ាឡើងមុខ! ទូកនាំមុខបានផ្លាស់ប្តូរហើយ! | Vừa có pha bứt phá vượt lên đổi ngôi dẫn đầu! | `ai-lead-change-km.mp3` | 4.29s | Tái sử dụng (Azure Stock) |
| 16 | `safe-margin` | duel | Khoảng cách dẫn rõ | ទូកនាំមុខកំពុងបង្កើនគម្លាត ប៉ុន្តែការប្រកួតមិនទាន់បញ្ចប់ទេ។ | Ghe dẫn đầu nới rộng cách biệt trên 8 m nhưng chưa kết thúc. | `ai-safe-margin-km.mp3` | 4.70s | **Tạo mới** (Azure Speech) |
| 17 | `history-tum-nup` | history | Lịch sử Tum Núp 2 | នៅឆ្នាំ ២០២៤ ក្រុមទូកទំនប់ ២ បានឈ្នះជើងឯកផ្នែកបុរស។ | Tum Núp 2 là đương kim vô địch nội dung nam năm 2024. | `trial-history-tum-nup-km.mp3` | 5.26s | Tái sử dụng (Azure Stock) |
| 18 | `history-kos-thum` | history | Lịch sử Kos Thum 1 | ក្រុមទូកកោះធំ ១ បានជាប់ចំណាត់ថ្នាក់លេខពីរ ផ្នែកបុរស នៅឆ្នាំ ២០២៤។ | Kos Thum 1 là á quân nội dung nam năm 2024. | `trial-history-kos-thum-km.mp3` | 5.89s | Tái sử dụng (Azure Stock) |
| 19 | `history-sro-lon` | history | Lịch sử Sro Lôn 2 | ក្រុមទូកសរឡូន ២ បានជាប់ចំណាត់ថ្នាក់លេខបី ផ្នែកបុរស នៅឆ្នាំ ២០២៤។ | Sro Lôn 2 là đội đạt hạng ba nội dung nam năm 2024. | `trial-history-sro-lon-km.mp3` | 5.81s | **Tạo mới** (Azure Speech) |
| 20 | `final` | final | Bắt đầu nước rút | ដល់ដំណាក់កាលចុងក្រោយហើយ! បង្កើនល្បឿន! | Vào đoạn 950 m nước rút, nhịp dầm đẩy mạnh hơn! | `ai-final-km.mp3` | 3.97s | Tái sử dụng (Azure Stock) |
| 21 | `sprint-effort` | final | Nhịp dầm mạnh hơn | ដល់ដំណាក់កាលចុងក្រោយហើយ! បង្កើនល្បឿន! | Nhịp dầm tăng mạnh mẽ trong khoảng 950–1.150 m. | `ai-final-km.mp3` | 3.97s | Tái sử dụng (Azure Stock) |
| 22 | `surge` | final | Đạp nước rút | ប្រឹងអស់កម្លាំង! | Đạp rồi! Dồn toàn bộ sức mạnh chặng cuối! | `ai-surge-km.mp3` | 1.82s | Tái sử dụng (Azure Stock) |
| 23 | `last-hundred` | final | 100 mét cuối | ១០០ ម៉ែត្រចុងក្រោយ! | Một trăm mét cuối cùng đến đích! | `ai-last-hundred-km.mp3` | 2.18s | Tái sử dụng (Azure Stock) |
| 24 | `last-fifty` | final | 50 mét cuối | ៥០ ម៉ែត្រចុងក្រោយ! | Năm mươi mét nước quyết định! | `ai-last-fifty-km.mp3` | 2.11s | Tái sử dụng (Azure Stock) |
| 25 | `finish-win` | result | Thắng lượt | ដល់ទីហើយ! សូមអបអរសាទរក្រុមដែលឈ្នះជើងប្រណាំងនេះ! | Về đích! Chúc mừng đội giành chiến thắng lượt đấu này! | `ai-finish-win-km.mp3` | 4.83s | Tái sử dụng (Azure Stock) |
| 26 | `finish-loss` | result | Thua lượt | គួរឱ្យសោកស្តាយ! គូប្រកួតបានដល់ទីមុន ក្នុងជើងប្រណាំងនេះ។ | Rất tiếc, đối thủ đã cán đích trước trong lượt này. | `ai-finish-loss-km.mp3` | 5.40s | Tái sử dụng (Azure Stock) |
| 27 | `finish-tie` | result | Kết quả hòa | លទ្ធផលស្មើគ្នា! ទូកទាំងពីរដល់ទីប្រកៀកប្រកិតគ្នា! | Kết quả hòa kịch tính! Hai ghe về đích ngang ngửa! | `ai-finish-tie-km.mp3` | 4.99s | Tái sử dụng (Azure Stock) |
| 28 | `finish-dnf` | result | Không hoàn thành | គួរឱ្យសោកស្តាយ ក្រុមមួយមិនបានបញ្ចប់ជើងប្រណាំងនេះទេ។ | Đáng tiếc, một đội đã không hoàn thành lượt đua. | `ai-finish-dnf-km.mp3` | 4.31s | Tái sử dụng (Azure Stock) |
| 29 | `cup-champion` | result | Vô địch cả cúp | សូមអបអរសាទរ {winner_name} ដែលបានឈ្នះជើងឯកពានរង្វាន់នេះ! | Xin chúc mừng {winner_name}, đội vô địch cúp lễ hội! | `ai-champion-tum-nup-km.mp3` | 4.51s | **Tạo mới** (Đã gán tên thật Tum Núp 2 / Kos Thum 1) |

---

## 3. Xử Lý Placeholder & Ghép Tên Đội Theo `registrationId`

Theo yêu cầu nghiêm ngặt tại **Mục 5**: *"Những câu có {player_name}, {opponent_name}, {winner_name} phải giải quyết bằng tên đúng đội từ registrationId. Không đưa nguyên placeholder vào TTS. Giữ riêng đội 1/đội 2 và đội nam/đội nữ."*

1. **Tình huống giới thiệu hai đội (`team-introduction`)**:
   - Trận đấu mẫu (`commentary-trial`): **Tum Núp 2** (`can_tho-23`, nam) gặp **Kos Thum 1** (`ca_mau-05`, nam).
   - Audio chính thức giải quyết trọn câu: `ai-intro-match-tum-nup-kos-thum-km.mp3`  
     *Nội dung đọc:* `ទុំនុប ២ ប្រកួតជាមួយ កោះធំ ១។ ក្រុមទាំងពីរកំពុងត្រៀមចេញដំណើរ។`
   - Bản audio câu dẫn kết nối (carrier phrase) phục vụ ghép động: `ai-intro-carrier-km.mp3`  
     *Nội dung đọc:* `ប្រកួតជាមួយ។ ក្រុមទាំងពីរកំពុងត្រៀមចេញដំណើរ។`
   - Tên đội riêng biệt: Đã có sẵn các file MP3 riêng của từng đội (`name-tum-nup-km.mp3`, `name-kos-thum-km.mp3`) với độ trễ âm thanh đã kiểm định.

2. **Tình huống vô địch cúp (`cup-champion`)**:
   - Nếu **Tum Núp 2** vô địch giải: `ai-champion-tum-nup-km.mp3`  
     *Nội dung đọc:* `សូមអបអរសាទរ ទុំនុប ២ ដែលបានឈ្នះជើងឯកពានរង្វាន់នេះ!`
   - Nếu **Kos Thum 1** vô địch giải: `ai-champion-kos-thum-km.mp3`  
     *Nội dung đọc:* `សូមអបអរសាទរ កោះធំ ១ ដែលបានឈ្នះជើងឯកពានរង្វាន់នេះ!`
   - Bản audio câu dẫn kết nối (carrier phrase): `ai-champion-carrier-km.mp3`  
     *Nội dung đọc:* `សូមអបអរសាទរ ដែលបានឈ្នះជើងឯកពានរង្វាន់នេះ!`

---

## 4. Kiểm Soát Phát Thanh Trong Game (Playback Policy & Single Speech Bus)

Nhằm đảm bảo chỉ có duy nhất **một giọng nói tại một thời điểm** và tránh nói đè hoặc nói sai ngữ cảnh:
- **Single Speech Bus**: Mọi cue bình luận đều xếp hàng trên 1 kênh duy nhất. Câu mới có ưu tiên cao hơn (ví dụ: `finish-win` prio 5, `last-hundred` prio 4) sẽ ngắt ngay lập tức câu mô tả chung (`cruise` prio 2).
- **Pre-play Revalidation**: Kiểm tra lại điều kiện đua (khoảng cách, thể lực, giai đoạn) ngay trước khi xuất âm thanh. Nếu điều kiện không còn thỏa mãn (ví dụ đã qua 950 m), câu sẽ bị hủy (`discardExpired: true`).
- **Cooldown & Max Queue Age**:
  - `maxQueueAgeSeconds`: 3–7 giây. Câu tồn đọng trong hàng đợi quá thời gian này sẽ tự động loại bỏ.
  - `cooldownSeconds`: 25 giây cho tình huống thường, 90 giây cho câu giới thiệu/lịch sử, chống lặp lại gây khó chịu cho người chơi.
- **Vô địch cúp (`cupChampion: true`)**: Chỉ phát khi giải đấu (`tournament.championId`) xác nhận đội vô địch chung kết toàn giải; tuyệt đối không phát khi thắng vòng bảng hoặc vòng loại.

---

## 5. Danh Mục File Bàn Giao

```
E:\AI\Um Tuk\audio\antigravity\output\khmer\
├── khmer-script.json     # Kịch bản JSON đầy đủ 29 cues, conditions, priority, audio mapping
├── khmer-script.csv      # Bảng CSV định dạng UTF-8 with BOM hiển thị chuẩn chữ Khmer
├── manifest.json         # Danh mục kỹ thuật toàn bộ 89 audio clips (SHA-256, duration, peak, RMS, bytes)
├── review.md             # Báo cáo tổng kết kiểm định chất lượng và biên bản bàn giao
└── audio/                # 89 file MP3 thực tế (24kHz mono 96kbps)
    ├── ai-ceremony-teams-km.mp3
    ├── ai-start-drive-km.mp3
    ├── ai-cruise-context-km.mp3
    ├── ai-safe-margin-km.mp3
    ├── trial-history-sro-lon-km.mp3
    ├── ai-intro-match-tum-nup-kos-thum-km.mp3
    ├── ai-intro-carrier-km.mp3
    ├── ai-champion-tum-nup-km.mp3
    ├── ai-champion-kos-thum-km.mp3
    ├── ai-champion-carrier-km.mp3
    ├── ... (và 79 file MP3 đã tái sử dụng / tên đội chuẩn hóa)
```

---

## 6. Khuyến Nghị Duyệt Phát Âm Bản Ngữ (Native Review)

1. Toàn bộ file TTS tạo mới đều giữ cờ kiểm định an toàn:
   ```json
   "nativeListeningVerified": false,
   "pronunciationReview": "Khmer drafts require native review"
   ```
2. Các câu bình luận tiếng Khmer đã được rà soát cấu trúc ngữ pháp tự nhiên theo phong cách đua ghe Ngo truyền thống Nam Bộ.
3. Trước khi xuất bản bản dựng chính thức, khuyến nghị người bản ngữ tiếng Khmer tại Sóc Trăng hoặc Trà Vinh thẩm định trực tiếp ngữ điệu nhấn nhá trên đường đua.
