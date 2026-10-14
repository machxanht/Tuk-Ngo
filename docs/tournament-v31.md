# Giải mô phỏng 8 ghe V31

`src/race/tournament-v31.mjs` là mô-đun JavaScript thuần, không thay đổi luật đua, DOM hay gameplay. Danh sách mặc định lấy tám ID từ `teams-2025.mjs`; thứ tự ghép cặp là thứ tự danh sách. Kết quả AI dùng một phép tung đồng xu có seed cho mỗi trận, không đọc `rank` hay suy ra sức mạnh đội thật.

```js
import {createTournament} from './src/race/tournament-v31.mjs';
const cup = createTournament({playerId:'tum-nup-2', seed:31});
const match = cup.currentMatch();
// Cho ghe người chơi ở lane 0, đối thủ match.opponentId ở lane 1.
// Khi gameplay kết thúc, gửi đúng result hiện có: win/loss/tie/dnf.
cup.finish({matchId:match.matchId, result:game.snapshot().result});
```

Giữ `matchId` đã chụp lúc bắt đầu cuộc đua. Không đọc lại trận hiện tại sau callback kết thúc để gán kết quả cũ vào vòng mới. Gọi `finish` lại với cùng ID và cùng kết quả trả cùng trạng thái, không tiến thêm vòng; cùng ID nhưng kết quả khác bị từ chối.

- `currentMatch()`: trả `{matchId, round, roundIndex, playerId, opponentId, teams, blocked}`; trả `null` sau bị loại hoặc vô địch. Vòng lần lượt `quarterfinal`, `semifinal`, `final`.
- `finish({matchId,result})`: thắng tiến vòng; ba lần thắng liên tiếp thành vô địch. Thua hoặc `dnf` bị loại, không tạo vòng tiếp theo. AI giải quyết các cặp còn lại trong vòng khi vòng được tạo.
- `retryTie()`: hành động rõ ràng để đua lại trận hòa, giữ hai đội nhưng tạo ID lượt mới. Hòa giữ nguyên vòng với `blocked=true`, không tự tiến vòng.
- `snapshot()`: bản sao JSON gồm bracket, trạng thái, champion và lịch sử.
- `restore(saved)`: xác thực đội/seed và tái dựng lịch sử; từ chối bracket hoặc winner không khớp. Khôi phục lỗi giữ trạng thái hiện tại nguyên vẹn.
- `reset({playerId,seed,teamIds}={})`: giải mới; bỏ qua tùy chọn giữ lựa chọn hiện tại. `teamIds`, nếu truyền, phải gồm đúng tám chuỗi ID khác nhau. Seed là số nguyên uint32.

```js
localStorage.setItem('tuk-tournament-v31', JSON.stringify(cup.snapshot()));
try { cup.restore(JSON.parse(localStorage.getItem('tuk-tournament-v31'))); }
catch { /* Hiển thị trạng thái giải mới và dữ liệu lưu không hợp lệ. */ }
```

Kiểm tra độc lập: `node scripts/test-tournament-v31.mjs`. Việc nối team renderer, nút vòng tiếp theo/đua lại hòa/chơi giải mới và kiểm tra trực tiếp trên giao diện thuộc phần tích hợp; mô-đun này không tự khởi động race hoặc thay difficulty.
