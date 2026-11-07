# innate-music

本地歌词抓取工具。纯 Python 标准库，零第三方依赖；默认目标是 The Cure 的 *Just Like Heaven*。

> **版权边界**：歌词版权独立于录音版权，由音乐出版商管理。本项目仅供个人本地使用。脚本只把正文写入本地文件，不向终端打印，本文档也不含歌词内容。把歌词做成视频字幕、印进画面、放进产品或对外分发，需另行取得授权。建议把 `data/` 加入 `.gitignore`。

## 目录契约

| 路径 | 职责 |
| --- | --- |
| `README.md` | 本文档 |
| `scripts/fetch-lyrics.py` | 抓取脚本，唯一可执行入口 |
| `data/` | 产物：`<artist>-<track>.lrc` 与 `.txt` |

所有路径由脚本自身位置推导（`Path(__file__).resolve().parents[1]`），不写死绝对路径。从工作区根或项目内运行效果一致。

## 运行

```bash
# 从工作区根
python3 innate-music/scripts/fetch-lyrics.py

# 从项目内
cd innate-music && python3 scripts/fetch-lyrics.py
```

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `--artist` | `The Cure` | 艺人名 |
| `--track` | `Just Like Heaven` | 曲名 |
| `--album` | `Kiss Me, Kiss Me, Kiss Me` | 优先精确匹配专辑，避开精选集版本 |
| `--duration` | `212.0` | 曲目时长（秒），用于挑选最接近的记录 |
| `--outdir` | `<project>/data` | 输出目录 |

## 数据来源与产物

[LRCLIB](https://lrclib.net/docs) —— 众包歌词库，无需 API key、CORS 开放。脚本请求 `GET /api/search?track_name=...&artist_name=...`，取返回记录里的 `plainLyrics` 和 `syncedLyrics` 两个字段；筛选逻辑是先按 album 精确匹配，再按时长取最接近的一条，且要求存在同步歌词。

| 产物 | 格式 | 说明 |
| --- | --- | --- |
| `.lrc` | `[mm:ss.xx] text` | 同步歌词，可直接喂给播放器 |
| `.txt` | 纯文本 | 未同步版本 |

**实测记录（2026-11-07）**：返回 20 条记录，选中 id `18873926`（专辑版，212.92s）；产出 `.lrc` 42 行 / 1412 B、`.txt` 44 行 / 952 B。LRC 42/42 行格式合规、时间戳严格递增，覆盖 49.95s → 203.28s —— 前 50 秒是纯器乐前奏，没有唱词。

## 两个已知的坑

1. **脏标签**：部分记录的 `artistName` 是 NUL 分隔的重复值（`The Cure\x00The Cure`）。直接删除 NUL 会粘成 `The CureThe Cure`。用 `clean()` 按 `\x00` 切分后保序去重。
2. **限流**：LRCLIB 对未标识客户端约 45 req/min，带具名 `User-Agent` 约 90 req/min。超限返回 429 并带 `Retry-After`，脚本读取该值退避重试（最多 2 次）。不要去掉 UA。

补充：LRCLIB 另有 `/api/get`，支持 `album_name` + `duration` 精确匹配（时长容差约 ±2 秒）。目前用 search 加本地筛选，够用且少一次请求。

## 能力边界

- 不做歌词翻译、不做音频对齐、不生成字幕文件。
- 若要做商业产品的歌词后端，LRCLIB 是众包库而非授权来源，应走 Musixmatch / LyricFind 等签约渠道。
- 做视频唱词字幕属于展示与同步用途，需先确认授权范围。
