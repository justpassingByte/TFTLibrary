---
title: "Kiến trúc Refactor: Tối ưu Data Flow Hình ảnh từ CDragon"
type: architecture_planning
status: approved
target_components: [
  "backend/scripts/sync-cdragon.mjs",
  "components/ui/champion-avatar.tsx",
  "lib/riot-cdn.ts",
  "app/admin/champions/AvatarEditor.tsx",
  "app/admin/champions/ChampionsPageClient.tsx",
  "backend/src/routes/admin.routes.ts",
  "backend/src/routes/meta.routes.ts",
  "next.config.ts"
]
---

# Kế Hoạch Kiến Trúc: Tối ưu Data Flow Hình ảnh từ CDragon

## 1. Vấn Đề Hiện Tại (Tech Debt)
- **Hardcode PBE Ở Nhiều Nơi:** Logic `tft17`/`tft18` check nằm rải rác ở 4+ file (champion-avatar.tsx, riot-cdn.ts, admin.routes.ts, meta.routes.ts). Mỗi set mới lại phải sửa tay.
- **Frontend Đoán URL:** Component `<ChampionAvatar>` dùng `getCDragonUrl()` với 4 tầng fallback không cần thiết.
- **Backend Routes Tự Build URL:** `admin.routes.ts` và `meta.routes.ts` chứa `getIconUrl()` nội bộ, cũng hardcode PBE logic.
- **URL Không Đầy Đủ:** DB lưu path tương đối `assets/characters/...`, bắt mọi consumer phải tự nối domain.

## 2. Mục Tiêu Tái Cấu Trúc
1. **Frontend "Zero Guessing":** UI chỉ nhận URL HTTPS hoàn chỉnh, nhét thẳng vào `<img src/>`.
2. **Chỉ 1 Cột `icon`:** Schema đã sạch (không có cột `splash`), giữ nguyên.
3. **Pre-compute Tại Sync Script:** `sync-cdragon.mjs` chịu trách nhiệm dựng full HTTPS URL.
4. **CDragon `c.icon` = Square:** Đây là ảnh vuông, dùng CSS crop hex/circle là đủ. Không cần splash.

## 3. Data Flow Sau Refactor

### Bước A: Sync Script (`sync-cdragon.mjs`)
- Lấy `c.icon` từ CDragon JSON
- Xác định base URL dựa trên `CDRAGON_SOURCE` env var (`pbe` hoặc `latest`)
- Build full HTTPS URL: lowercase, xóa `ASSETS/` prefix, thay `.tex`→`.png`
- Preserve URL Supabase nếu admin đã crop (startsWith `http`)
- Fix bug cú pháp hiện tại (missing `.map()` wrapper)

### Bước B: Database
- Cột `icon` chứa full HTTPS URL (CDragon hoặc Supabase)
- Không sửa schema

### Bước C: AvatarEditor
- Load ảnh square từ `champion.icon` (HTTPS URL)
- Admin crop/pan → export 128x128 PNG → upload Supabase
- Supabase URL ghi đè vào cột `icon`
- Xóa tham chiếu `splash` (field không tồn tại)

### Bước D: Frontend Render
- `<ChampionAvatar>` đơn giản: `src = champion.icon || placeholder`
- Xóa hoàn toàn `getCDragonUrl()`, xóa fallback chain

### Bước E: Backend Routes
- `admin.routes.ts` và `meta.routes.ts`: icon từ DB đã là URL đầy đủ
- Xóa/sửa `getIconUrl()` helper — chỉ cần return trực tiếp

## 4. Danh Sách File Cần Sửa

| # | File | Hành động |
|---|------|-----------|
| 1 | `backend/scripts/sync-cdragon.mjs` | Fix `.map()` bug + pre-compute full HTTPS URL |
| 2 | `components/ui/champion-avatar.tsx` | Xóa `getCDragonUrl()`, simplify render logic |
| 3 | `lib/riot-cdn.ts` | Xóa hardcode `tft17`, thêm guard `startsWith('http')` |
| 4 | `app/admin/champions/AvatarEditor.tsx` | Xóa `splash` prop, dùng `icon` trực tiếp |
| 5 | `app/admin/champions/ChampionsPageClient.tsx` | Xóa import `getCDragonUrl` |
| 6 | `backend/src/routes/admin.routes.ts` | Sửa `getIconUrl()` — return trực tiếp nếu đã là HTTP |
| 7 | `backend/src/routes/meta.routes.ts` | Sửa `getIconUrl()` — return trực tiếp nếu đã là HTTP |
| 8 | `next.config.ts` | Thêm Supabase hostname vào `remotePatterns` |
