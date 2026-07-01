# Design Tokens — 색·타이포·간격 토큰

> 범위: `apps/dms-console` 콘솔 한정. 값의 단일 기준(SoT)은 [README.md](./README.md) 4절 색 팔레트이며, 이 문서는 그 hex를 그대로 토큰화한다. 색-상태 대응 규칙은 [../ia/status-taxonomy.md](../ia/status-taxonomy.md) 5절, 레이아웃·접근성 기준은 [../ia/foundation.md](../ia/foundation.md)를 따른다.

토큰은 CSS 변수(`--...`)로 노출하고 동일 값을 JSON으로 미러링한다([README.md](./README.md) 1절: "디자인 토큰을 CSS 변수로 노출(+ JSON 미러)"). 코드는 항상 토큰을 참조하고 hex 리터럴을 직접 쓰지 않는다.

원칙(공통):

- hex는 [README.md](./README.md) 4절 값을 그대로 쓴다. 새 색을 임의로 만들지 않는다.
- 색은 항상 텍스트 라벨(배지·칩·범례)과 함께 노출한다. **색만으로 의미를 구분하지 않는다**([../ia/status-taxonomy.md](../ia/status-taxonomy.md) 5절). 상태·선택·우선순위는 색 외에 라벨·굵기·아이콘·aria 속성을 병행한다([../ia/foundation.md](../ia/foundation.md) 10절).
- 다크 모드는 현재 범위 밖이다(하단 참조).

## 1. 색 토큰

[README.md](./README.md) 4절 팔레트를 그대로 옮긴 것이다. 좌측 CSS 변수명이 코드에서 쓰는 이름이고, hex는 원본과 1:1 대응한다.

### 1.1 primary / 선택

| 토큰 | hex | 용도 |
| --- | --- | --- |
| `--color-primary` | `#2563EB` | 선택/primary 강조, 활성 내비게이션 |
| `--color-primary-tint` | `#EFF6FF` | 선택 배경 tint(사이드바 선택 배경 등) |

### 1.2 상태(공통 상태 색)

[../ia/status-taxonomy.md](../ia/status-taxonomy.md) 5.1의 색-상태 대응(done=파랑, in_progress=초록, planned=회색)을 그대로 토큰화한다.

| 토큰 | hex | 상태 |
| --- | --- | --- |
| `--color-status-done` | `#2563EB` | done(완료) · 파랑 |
| `--color-status-in-progress` | `#16A34A` | in_progress(진행중) · 초록 |
| `--color-status-planned` | `#9CA3AF` | planned(진행예정) · 회색 |

> `--color-status-done`은 `--color-primary`와 같은 hex(`#2563EB`)다. 의미가 다르므로 토큰은 분리해 둔다(선택 vs 완료).

### 1.3 정지/보류(on_hold)

| 토큰 | hex | 용도 |
| --- | --- | --- |
| `--color-on-hold` | `#F59E0B` | Agent 보류 등 흐름 이탈(앰버) |

### 1.4 우선순위

[../ia/status-taxonomy.md](../ia/status-taxonomy.md) 9절 우선순위 축에 대응한다.

| 토큰 | hex | 우선순위 |
| --- | --- | --- |
| `--color-priority-urgent` | `#DC2626` | urgent(긴급) · 적색 |
| `--color-priority-high` | `#EA580C` | high(높음) · 주황 |
| `--color-priority-normal` | `#6B7280` | normal(보통, 기본값) · 중립 회색 |
| `--color-priority-low` | `#D1D5DB` | low(낮음) · 옅은 회색 |

### 1.5 뉴트럴

| 토큰 | hex | 용도 |
| --- | --- | --- |
| `--color-bg` | `#FFFFFF` | 페이지 배경 |
| `--color-surface` | `#F9FAFB` | 카드·패널 표면 |
| `--color-border` | `#E5E7EB` | 구분선·보더 |
| `--color-text` | `#111827` | 본문 텍스트 |
| `--color-text-muted` | `#6B7280` | 보조·캡션 텍스트 |

### 1.6 시맨틱

| 토큰 | hex | 용도 |
| --- | --- | --- |
| `--color-error` | `#DC2626` | 오류·실패 |
| `--color-success` | `#16A34A` | 성공 |
| `--color-warning` | `#F59E0B` | 경고 |
| `--color-info` | `#2563EB` | 정보 |

### 1.7 CSS 변수 정의

```css
:root {
  /* primary / 선택 */
  --color-primary: #2563EB;
  --color-primary-tint: #EFF6FF;

  /* 상태 */
  --color-status-done: #2563EB;
  --color-status-in-progress: #16A34A;
  --color-status-planned: #9CA3AF;

  /* 정지/보류 */
  --color-on-hold: #F59E0B;

  /* 우선순위 */
  --color-priority-urgent: #DC2626;
  --color-priority-high: #EA580C;
  --color-priority-normal: #6B7280;
  --color-priority-low: #D1D5DB;

  /* 뉴트럴 */
  --color-bg: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-border: #E5E7EB;
  --color-text: #111827;
  --color-text-muted: #6B7280;

  /* 시맨틱 */
  --color-error: #DC2626;
  --color-success: #16A34A;
  --color-warning: #F59E0B;
  --color-info: #2563EB;
}
```

### 1.8 JSON 미러

```json
{
  "color": {
    "primary": "#2563EB",
    "primaryTint": "#EFF6FF",
    "status": {
      "done": "#2563EB",
      "inProgress": "#16A34A",
      "planned": "#9CA3AF"
    },
    "onHold": "#F59E0B",
    "priority": {
      "urgent": "#DC2626",
      "high": "#EA580C",
      "normal": "#6B7280",
      "low": "#D1D5DB"
    },
    "neutral": {
      "bg": "#FFFFFF",
      "surface": "#F9FAFB",
      "border": "#E5E7EB",
      "text": "#111827",
      "textMuted": "#6B7280"
    },
    "semantic": {
      "error": "#DC2626",
      "success": "#16A34A",
      "warning": "#F59E0B",
      "info": "#2563EB"
    }
  }
}
```

## 2. 색 매핑표 (enum → 토큰)

[README.md](./README.md) 3절 Canonical Enums의 각 값을 색 토큰에 연결한다. 모든 매핑은 [../ia/status-taxonomy.md](../ia/status-taxonomy.md)의 색 규칙(done=파랑, in_progress=초록, planned=회색, on_hold=앰버)을 준수한다. 색은 항상 라벨과 함께 노출한다.

### 2.1 CommonStatus / WorkStatus → 색

WorkStatus의 `review`(리뷰중)는 [../ia/status-taxonomy.md](../ia/status-taxonomy.md) 8절 매핑상 "진행중"으로 환산되므로 진행 계열(초록)을 쓰되, 진행중과 구분이 필요하면 같은 계열의 명도 차로 표현한다(5.2절).

| enum 값 | 라벨 | 토큰 | 색 |
| --- | --- | --- | --- |
| `planned` | 진행예정 | `--color-status-planned` | 회색 |
| `in_progress` | 진행중 | `--color-status-in-progress` | 초록 |
| `review` (WorkStatus) | 리뷰중 | `--color-status-in-progress` | 초록(진행 계열) |
| `done` | 완료 | `--color-status-done` | 파랑 |

### 2.2 AgentStatus → 색

[../ia/status-taxonomy.md](../ia/status-taxonomy.md) 5.2·8절: 기획중=진행(초록), 확정=종료(파랑), 보류=정지(앰버).

| enum 값 | 라벨 | 토큰 | 색 |
| --- | --- | --- | --- |
| `draft` | 기획중 | `--color-status-in-progress` | 초록(진행 계열) |
| `confirmed` | 확정 | `--color-status-done` | 파랑(종료 계열) |
| `on_hold` | 보류 | `--color-on-hold` | 앰버 |

### 2.3 IssueState → 색

[../ia/status-taxonomy.md](../ia/status-taxonomy.md) 3.2·8절: open=진행(초록), closed=종료(파랑). GitHub 정본.

| enum 값 | 라벨 | 토큰 | 색 |
| --- | --- | --- | --- |
| `open` | open | `--color-status-in-progress` | 초록(진행 계열) |
| `closed` | closed | `--color-status-done` | 파랑(종료 계열) |

### 2.4 Priority → 색

| enum 값 | 라벨 | 토큰 | 색 |
| --- | --- | --- | --- |
| `urgent` | 긴급 | `--color-priority-urgent` | 적색 |
| `high` | 높음 | `--color-priority-high` | 주황 |
| `normal` | 보통(기본값) | `--color-priority-normal` | 중립 회색 |
| `low` | 낮음 | `--color-priority-low` | 옅은 회색 |

### 2.5 선택 상태 → primary

사이드바 2차 메뉴 선택, 활성 1차 메뉴 등 "선택/활성"은 primary로 표시한다([../ia/foundation.md](../ia/foundation.md) 4절: 선택=파란 배경).

| 대상 | 토큰 | 비고 |
| --- | --- | --- |
| 선택 배경(tint) | `--color-primary-tint` | 사이드바 선택 항목 배경 |
| 선택 강조(글자·보더·액센트) | `--color-primary` | 선택 텍스트/좌측 액센트 등 |

> 선택 상태는 색만으로 전달하지 않는다. 포커스 링·굵기·`aria-current` 등 보조 표기를 병행한다([../ia/foundation.md](../ia/foundation.md) 10절).

## 3. 타이포

폰트 패밀리는 시스템 폰트 스택을 기본으로 한다(다국어 없음, 한국어 단일 — [README.md](./README.md) 1절). 스케일은 페이지 제목 / 섹션 / 본문 / 캡션 4단계다.

| 토큰(역할) | font-size | font-weight | line-height | 용도 |
| --- | --- | --- | --- | --- |
| `--font-size-page-title` | 24px | 700 | 1.3 | 페이지 헤더 제목 |
| `--font-size-section` | 18px | 600 | 1.4 | 섹션 헤더·서브 제목 |
| `--font-size-body` | 14px | 400 | 1.6 | 본문·목록·폼 |
| `--font-size-caption` | 12px | 400 | 1.5 | 캡션·보조 설명·메타 |

```css
:root {
  --font-family-base:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;

  /* 크기 */
  --font-size-page-title: 24px;
  --font-size-section: 18px;
  --font-size-body: 14px;
  --font-size-caption: 12px;

  /* 무게 */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* 행간 */
  --line-height-tight: 1.3;
  --line-height-heading: 1.4;
  --line-height-body: 1.6;
}
```

```json
{
  "typography": {
    "fontFamily": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", \"Apple SD Gothic Neo\", \"Noto Sans KR\", sans-serif",
    "size": {
      "pageTitle": "24px",
      "section": "18px",
      "body": "14px",
      "caption": "12px"
    },
    "weight": {
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "lineHeight": {
      "tight": 1.3,
      "heading": 1.4,
      "body": 1.6
    }
  }
}
```

## 4. 간격 (space · radius · border · elevation · z-index)

### 4.1 간격 스케일 (4px 베이스)

`--space-1`을 4px로 두고 4의 배수로 확장한다.

| 토큰 | 값 |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

### 4.2 라운드(radius)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--radius-sm` | 4px | 배지·칩·입력 |
| `--radius-md` | 8px | 카드·패널·버튼 |
| `--radius-lg` | 12px | 모달·큰 표면 |
| `--radius-full` | 9999px | 원형(도트·아바타) |

### 4.3 보더 두께

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--border-width-hairline` | 1px | 기본 구분선·보더 |
| `--border-width-emphasis` | 2px | 선택·포커스 강조 보더 |

### 4.4 그림자(elevation, 3단)

| 토큰 | 단계 | 용도 |
| --- | --- | --- |
| `--elevation-1` | 낮음 | 카드·표면 살짝 부양 |
| `--elevation-2` | 중간 | 드롭다운·팝오버·드로어 |
| `--elevation-3` | 높음 | 모달 |

### 4.5 z-index 레이어

[../ia/foundation.md](../ia/foundation.md) 2절(상단 바·사이드바 고정)·10절(좁은 화면 드로어)·5절(모달 수용)의 겹침 순서를 정한다. 위로 갈수록 앞이다.

| 토큰 | 값 | 레이어 |
| --- | --- | --- |
| `--z-sidebar` | 100 | 좌측 사이드바 |
| `--z-topbar` | 200 | 상단 바(스크롤 시 고정) |
| `--z-drawer` | 300 | 좁은 화면 사이드바 드로어 |
| `--z-modal` | 400 | 모달·오버레이 |

```css
:root {
  /* 간격 (4px 베이스) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* 라운드 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* 보더 두께 */
  --border-width-hairline: 1px;
  --border-width-emphasis: 2px;

  /* 그림자 (elevation 3단) */
  --elevation-1: 0 1px 2px rgba(17, 24, 39, 0.06);
  --elevation-2: 0 4px 12px rgba(17, 24, 39, 0.10);
  --elevation-3: 0 12px 32px rgba(17, 24, 39, 0.16);

  /* z-index 레이어 */
  --z-sidebar: 100;
  --z-topbar: 200;
  --z-drawer: 300;
  --z-modal: 400;
}
```

```json
{
  "space": {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px"
  },
  "radius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "full": "9999px"
  },
  "borderWidth": {
    "hairline": "1px",
    "emphasis": "2px"
  },
  "elevation": {
    "1": "0 1px 2px rgba(17, 24, 39, 0.06)",
    "2": "0 4px 12px rgba(17, 24, 39, 0.10)",
    "3": "0 12px 32px rgba(17, 24, 39, 0.16)"
  },
  "zIndex": {
    "sidebar": 100,
    "topbar": 200,
    "drawer": 300,
    "modal": 400
  }
}
```

> 그림자 rgba는 뉴트럴 텍스트색(`#111827`)에 투명도를 준 값이며 새 색 팔레트가 아니다. 불투명도만 elevation 단계를 나눈다.

## 5. 다크 모드

현재 범위 밖이다. [README.md](./README.md) 4절 팔레트는 라이트 모드 단일 기준이며, 이 문서는 라이트 값만 정의한다. 다크 모드 토큰(대응 hex·대비)은 도입 시점에 별도로 추가한다.
