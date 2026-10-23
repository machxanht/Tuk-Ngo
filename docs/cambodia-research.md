# Hai sân Campuchia: tư liệu và luật trong game

Rà soát ngày 24/10/2026. Đã bổ sung **Phnom Penh – Tonle Sap (1.700 m)** và **Siem Reap – sông đô thị (500 m)**. Hai cự ly này dựa trên tư liệu lịch sử dẫn ở dưới; chưa có đủ căn cứ để coi là cự ly và điều lệ chính thức năm 2026.

- **Phnom Penh:** đường trường, dòng ngang mạnh hơn, hao thể lực nhiều hơn và hồi sức chậm hơn. Bối cảnh gồm bờ hoàng cung, mái nhiều tầng, đình đón lễ, phố ven sông và đường chân trời bờ đối diện.
- **Siem Reap:** chặng ngắn, hành lang lái hẹp, tăng tốc ít tốn sức hơn. Bối cảnh là sông trong phố, đình ven sông, cầu ngoài đoạn đua, hàng quán và cây xanh; không đặt Angkor Wat cạnh sông.
- Cả hai có luyện tập, đua đôi với AI và cúp mời 8 đội. Về đích tính theo mũi ghe. Hòa thì đua lại; các lượt khác trong nhánh đấu được mô phỏng. Đây là luật game, chưa phải điều lệ chính thức Campuchia.
- Đã đối chiếu **8 tên đội** để đưa vào danh sách mời, kèm chữ Khmer và nguồn từng tên trong [CSV](cambodia-teams.csv). Mẫu ghe, số VĐV hiển thị và màu áo hiện dùng bộ asset chung; chưa phải bản sao của từng đội thật. Một đội dùng kiểu chèo khác được giữ riêng trong dữ liệu nghiên cứu.
- Số lượng được báo cáo ở Phnom Penh 2024 là **346 ghe thi đấu**; một báo cáo đăng ký ghi **348 ghe / 22.042 tay bơi**. Hai con số thuộc phạm vi báo cáo khác nhau. Siem Reap 2023 được báo cáo có **32 ghe đua**. Không gán các số này thành danh sách giải 2026.

## Tư liệu chi tiết và giới hạn xác minh

Reviewed 24 October 2026. These are playable festival interpretations, not a
claim to reproduce the official 2026 event or its complete regulations.

## Phnom Penh / ភ្នំពេញ

The national celebration races on the Tonle Sap in front of the Royal Palace.
The [National Radio report, 15 Nov 2024](https://rnk.gov.kh/article/43375)
confirms the location and three-day format. Reporting distinguishes paddle,
chev/oar and international classes; these must not be treated as one identical
boat class. [A boatbuilder interview, 12 Nov 2024](https://thmeythmey.com/detail/141902)
records 346 boats: 170 paddle, 45 chev, 131 international, including women.
The [CamboJA registration report](https://cambojanews.com/all-systems-in-place-for-annual-water-festival-boat-race-in-phnom-penh/)
instead reports 348 registrations and 22,042 rowers. These are different counts,
not evidence for inventing a definitive 2026 roster.

A historical 1,700 m race is described in [a 2015 boat-committee interview](https://khmercircle.blogspot.com/2015/11/lack-of-boat-races-leaves-villagers.html)
(archived Phnom Penh Post reporting). This is historical evidence, not a
current official course measurement. The game uses a 1,700 m endurance course.
Its current, endurance tuning and cup bracket are authored game rules.

For visual layout use the [Cambodian Embassy's 16 Nov 2024 photo series](https://www.embassyofcambodiadc.org/news1/a-series-of-photos-along-the-tonle-sap-river-in-front-of-the-royal-palace-on-the-3rd-day-of-the-royal-festival-of-boats-floating-boats-and-the-full-moon-festival-ok-ambokphnom-penh):
broad river, west-bank Royal Palace roofs and public promenade, pavilion,
distant east-bank skyline. Do not put Angkor Wat next to the course.

## Siem Reap / សៀមរាប

[First-hand 2024 photographs and field notes](https://helloangkor.com/in-pictures-the-water-festival-siem-reap-2024/)
show the narrow urban river, Pokambor Avenue pavilion, bridges near NR6 and
Tep Vong, planted banks, markets and dense crowds. The [provincial spokesperson
interview in 2023](https://www.cambodianess.com/article/boat-rides-and-cultural-events-are-set-for-the-water-festival-in-siem-reap)
records 32 race boats; tourist boat rides are a separate activity.

[The 2008 technical-committee interview](https://khmernz.blogspot.com/2008/11/off-to-races-in-siem-reap.html?m=0)
(archived Phnom Penh Post reporting) describes 500 m, crews of 22, men's and
women's divisions and four groups followed by tournament racing. The game uses
a 500 m short sprint, with a narrower steering corridor and faster response.
The exact modern course length and full official local entry list are not
verified. Do not label these old rules as the 2026 regulations.

The [2025 AKP report](https://vps.akp.gov.kh/post/detail/352616) records a friendship
race and activities along the river and Royal Residence Park. The game is a
festival interpretation with invited Cambodian teams, not a verified Siem Reap
entry list. Royal Gardens and a modest riverside pavilion are appropriate;
Angkor Wat on the riverbank is not.

## Team identity and rules limits

The accompanying sourced team records retain Khmer spellings from interviews.
Romanised names are display transliterations, not official Vietnamese names.
Boat colours are game liveries unless a source explicitly establishes them.
Chev boats use a different rowing mechanism, so they remain in research only
until that rig exists. The existing paddle-crew rigs and shirt are preserved.
No historical rank changes a player's boat speed.

Eight sourced identities are exported in [cambodia-teams.csv](cambodia-teams.csv)
and `public/assets/data/cambodia-teams.json`, with Khmer spellings and source
URLs. Seven have 2024 identity evidence. Sdach Damrey Sa Phluk Khiev Meanchey
Baramey Wat Aranh Sakor has a [2026 provincial-government report](https://takeo.info.gov.kh/km/article/01a13e92-415c-767b-827c-4bf4c090200a)
quoting the boat's abbot after provincial races. This does not establish an
official 2026 Phnom Penh or Siem Reap city entry. The invitational cups use
eight equal game hulls; actual crew sizes, class divisions, uniforms and hulls
are not reproduced. The 46-rower Tepthida record remains research-only because
its reported chev mechanism needs a different rig.

| Venue | Evidence distance adopted | Game stages | Play difference |
| --- | --- | --- | --- |
| Maspéro | Existing 1,200 m game course | 0–200 / 200–950 / 950–1,200 m | Balanced two-button race |
| Phnom Penh | Historical 1,700 m | 0–200 / 200–1,450 / 1,450–1,700 m | More stamina drain, slower recovery, stronger cross-current |
| Siem Reap | Historical 500 m | 0–80 / 80–350 / 350–500 m | Short sprint, lower boost cost, narrower steering corridor |

All three support practice, AI heats and a game knockout cup (61 teams at
Maspéro; eight invitations at each Cambodian venue). Crossing order is timed
at fixed 240 Hz with interpolated bow crossings. Other bracket heats are
seeded simulations. UI and audio milestones use actual course distances;
the last 100 m and 50 m announcements never reuse 1,100/1,150 m as Cambodian
world coordinates. Currents, lane widths, stamina values and ties/replays are authored game balance, not measured hydrology or official rules.

Winning means the bow crosses first. No deliberate contact; each boat stays
inside its corridor. Countdown, ties/replays, exhaustion and elimination remain
explicit game rules. Published reports are not a complete rulebook; no invented
foul or tie rule is presented as an official Cambodian regulation.
