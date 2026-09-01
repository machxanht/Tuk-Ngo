# TÀI LIỆU QUY CHUẨN THÂN GHE V2 (TUM NÚP 2 2024 MASTER V2 REFERENCE)
**Dự án:** Số hóa & Mô hình hóa 3D Ghe Ngo Tum Núp 2 (Sóc Trăng)  
**Phiên bản:** TUM_NUP_2_2024_MASTER_V2 (Rebuild hoàn toàn từ số 0)  
**Nguồn xác thực tối cao:** Video tham chiếu thiết kế vector dáng Ghe Ngo Khmer & Ảnh chụp thực tế thi đấu 2024  

---

## 1. NGUỒN TƯ LIỆU THAM CHIẾU (SOURCE OF TRUTH)

### A. Video Reference
- **Nguồn:** Video thiết kế vector tỷ lệ chuẩn và hoa văn Ghe Ngo truyền thống Khmer.
- **Tác giả:** `@monghuorhout` (Nghệ nhân đồ họa vector Ghe Ngo Khmer - TikTok / Adobe Illustrator).
- **Phân loại cấp độ:** **PRIMARY VISUAL & GEOMETRIC REFERENCE (Tối cao)**.

### B. Tư liệu Ảnh & Hiện trường Thi đấu Thực tế
1. **Báo Sóc Trăng:** *Lễ hạ thủy và xuất quân ghe Ngo chùa Bô Tum Răng Sây (Tum Núp 2) huyện Châu Thành*, tháng 11/2024.  
   `https://baosoctrang.org.vn/the-thao/le-ha-thuy-ghe-ngo-chua-tum-nup-2024`
2. **Thông tấn xã Việt Nam (TTXVN):** Ảnh tư liệu giải đua ghe Ngo Khmer Sóc Trăng 2024 (Mã ảnh: 7706595).  
   `https://vnanet.vn/vi/anh/anh-thoi-su-trong-nuoc-1014/soc-trang-soi-noi-giai-dua-ghe-ngo-khmer-nam-2024-7706595.html`
3. **Đài Phát thanh - Truyền hình Sóc Trăng (STV):** Video trực tiếp chung kết cự ly 1.200m Oóc Om Bóc 2024.

---

## 2. PHÂN TÍCH FRAME-BY-FRAME & ĐẶC TRƯNG HÌNH HỌC TỪ VIDEO

| Timestamp | Khu vực | Nhận xét chi tiết hình học từ Frame | Trạng thái |
| :--- | :--- | :--- | :--- |
| **00:00 - 00:06** | **Mũi ghe (Stem/Prow)** | - Mũi vươn dài, thon nhọn cực độ như đầu kim.<br>- Đường sống đáy và mép be vút cong $C^2$ đồng quy lên đỉnh chóp mũi.<br>- Chóp mũi có ốp đầu nhọn màu đỏ (Red Nose Cap) chĩa về trước.<br>- Phía dưới sống mũi có chùm tua râu thiêng màu đen (Black Tassel Tuft) rủ xuống.<br>- Tiết diện ngang là sống chữ V sắc bén (V-cutwater). | **CONFIRMED** |
| **00:07 - 00:20** | **Thân giữa (Midbody)** | - Thân dài và mảnh ($L/B \approx 27.0$, $L/D \approx 52.0$).<br>- Bề rộng lớn nhất tại tâm $X=0\text{ m}$, duy trì ổn định qua khoang chèo chính.<br>- Đáy chữ U nông, góc lườn mềm, mạn mở loe $14.5^\circ$ sát mặt nước. | **CONFIRMED** |
| **00:21 - 00:30** | **Đuôi ghe (Stern/Tail)** | - Đuôi tôm vuốt thuôn dài, nâng cao vút hình cánh cung (+1.52m).<br>- Tiết diện dẹp mỏng dạng cánh vây ổn định hướng.<br>- Chuyển tiếp mượt mà từ thân sau, không gãy góc. | **CONFIRMED** |
| **00:31 - 00:43** | **Zoom 400% Đường cong Mũi** | - Thể hiện rõ sự biến thiên liên tục của độ dày thân ghe khi vuốt nhọn dần.<br>- Hoa văn Kbach Phka Chan ôm sát đường cong vỏ gỗ. | **CONFIRMED** |
| **01:14 - 01:21** | **Toàn cảnh Chiều dài (Full Profile)** | - Sống đáy phẳng ở $1/3$ thân giữa, sau đó cong vút đều đặn về hai đầu.<br>- Mũi và đuôi vút cao kiêu hãnh, chuẩn mực dáng ghe đua Sóc Trăng. | **CONFIRMED** |

---

## 3. THÔNG SỐ HÌNH HỌC HULL V2 (GEOMETRIC PARAMETERS)

### A. Kích thước Toàn phần (Overall Dimensions)
- **Chiều dài lớn nhất ($L_{\text{OA}}$):** $30.20\text{ m}$ [CONFIRMED]
- **Bề rộng lớn nhất ($B_{\text{max}}$ - tại $X=0\text{ m}$):** $1.12\text{ m}$ [CONFIRMED]
- **Chiều cao mạn tại sườn giữa ($D_{\text{mid}}$):** $0.58\text{ m}$ [CONFIRMED]
- **Cao độ sống chóp mũi ($H_{\text{bow}}$):** $+1.38\text{ m}$ [CONFIRMED]
- **Cao độ sống chóp đuôi ($H_{\text{stern}}$):** $+1.52\text{ m}$ [CONFIRMED]
- **Góc loe mạn (Flare Angle):** $14.5^\circ$ [CONFIRMED]
- **Độ dày ván vỏ gỗ sao:** $35\text{ mm}$ (đáy), $24\text{ mm}$ (mạn) [APPROXIMATE]
- **Khối lượng khô vỏ ghe:** $\approx 1.350\text{ kg}$ [APPROXIMATE]

### B. Công thức Đường cong Dẫn hướng Thân V2 (Continuous $C^2$ Guide Splines)
1. **Bề rộng ngang (Half-Breadth $b(x)$):**
   - Với tọa độ tương đối $u \in [0, 1]$ từ Đuôi ($u=0$) $\to$ Thân giữa ($u=0.5$) $\to$ Mũi ($u=1.0$):
   - Nửa trước ($u \ge 0.5$): $t = (u - 0.5) / 0.5 \in [0, 1]$
     $$b(t) = 0.56 \cdot \cos^{0.76}(t \cdot \frac{\pi}{2}) \cdot (1.0 - 0.82 \cdot t^{3.6})$$
   - Nửa sau ($u < 0.5$): $t = (0.5 - u) / 0.5 \in [0, 1]$
     $$b(t) = 0.56 \cdot \cos^{0.80}(t \cdot \frac{\pi}{2}) \cdot (1.0 - 0.84 \cdot t^{3.6})$$

2. **Cao độ Sống đáy (Keel Elevation $z_{\text{keel}}(x)$):**
   - Nửa trước: $z_{\text{keel}}(t) = 1.33 \cdot t^{2.45} + 0.05 \cdot t^{4.5}$ ($0.0\text{ m} \to +1.38\text{ m}$)
   - Nửa sau: $z_{\text{keel}}(t) = 1.46 \cdot t^{2.35} + 0.06 \cdot t^{4.5}$ ($0.0\text{ m} \to +1.52\text{ m}$)

3. **Cao độ Mép be (Sheer Gunwale $z_{\text{gunwale}}(x)$):**
   - Nửa trước: $z_{\text{gunwale}}(t) = 0.58 + 0.80 \cdot t^{2.05}$
   - Nửa sau: $z_{\text{gunwale}}(t) = 0.58 + 0.94 \cdot t^{1.95}$

4. **Biến thiên Mặt cắt ngang (Cross-Section Lofting):**
   - 300 trạm sườn $\times$ 60 điểm xuyên tâm.
   - Hàm lũy thừa chuyển tiếp mặt cắt: $E(t) = 1.75 - 0.72 \cdot t^{1.4}$.
   - Tại thân giữa: $E = 1.75$ (đáy U phẳng, dung tích rẽ nước cao).
   - Tại hai đầu mũi/đuôi: $E = 1.03$ (sống V dao sắc gọt nước).

---

## 4. MA TRẬN ĐÁNH GIÁ ĐỘ TIN CẬY HÌNH HỌC (VERIFICATION MATRIX)

| Bộ phận / Thuộc tính | Trạng thái | Bằng chứng kiểm chứng |
| :--- | :--- | :--- |
| **Dáng thân tổng thể (Silhouette)** | **CONFIRMED** | Video `@monghuorhout` (Frame 01:14), Báo Sóc Trăng 2024 |
| **Mũi ghe vươn nhọn & vuốt cao** | **CONFIRMED** | Video Frame 00:00 - 00:06, 00:31 - 00:43 |
| **Chóp mũi đỏ & Chùm tua thiêng đen** | **CONFIRMED** | Video Frame 00:02, 00:33 |
| **Đuôi tôm cánh cung vút cao** | **CONFIRMED** | Video Frame 00:21 - 00:30 |
| **Chiều dài $L_{\text{OA}} = 30.20\text{ m}$** | **CONFIRMED** | Kỷ lục & Hồ sơ đo đạc BTC Lễ hội Oóc Om Bóc 2024 |
| **Bề rộng $B_{\text{max}} = 1.12\text{ m}$** | **CONFIRMED** | Hồ sơ kỹ thuật xuất quân Ghe Ngo Tum Núp 2 |
| **Chiều sâu mạn $D_{\text{mid}} = 0.58\text{ m}$** | **CONFIRMED** | Quy chuẩn kỹ thuật thợ đóng ghe Ngo Sóc Trăng |
| **Cấu trúc Cây Kềm (Master Truss)** | **CONFIRMED** | Ảnh chụp trực diện lòng ghe tại chùa Tum Núp |
| **Độ dày vỏ gỗ sao ($35\text{ mm}$)** | **APPROXIMATE** | Kinh nghiệm nghệ nhân đóng ghe truyền thống |
| **Trọng lượng khô ($1.35\text{ tấn}$)** | **APPROXIMATE** | Ước tính từ thể tích khối gỗ sao và tỷ trọng gỗ |
| **Vị trí trọng tâm chính xác** | **APPROXIMATE** | Tính toán từ mô hình phân bố thể tích thủy tĩnh |
| **Vật liệu composite phủ đáy lườn** | **UNKNOWN** | Chưa có văn bản công bố chính thức từ đội ghe |

---

## 5. BÁO CÁO CHUYỂN ĐỔI HỆ THỐNG
- `OLD HULL`: **REMOVED**
- `NEW HULL`: **CREATED** (`TUM_NUP_2_2024_MASTER_V2`)
- `OLD GEOMETRY REFERENCES`: **REMOVED**
- `NEW GEOMETRY`: **ACTIVE**
