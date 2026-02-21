import { DesignConfig, COLOR_PRESETS, FONT_OPTIONS } from '../types';

interface DesignPanelProps {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
}

export default function DesignPanel({ design, onChange }: DesignPanelProps) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
        디자인 설정
      </h3>

      {/* 색상 프리셋 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          색상 프리셋
        </label>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              title={preset.name}
              onClick={() =>
                onChange({
                  ...design,
                  backgroundColor: preset.bg,
                  textColor: preset.text,
                  accentColor: preset.accent,
                })
              }
              className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 relative overflow-hidden ${
                design.backgroundColor === preset.bg &&
                design.textColor === preset.text
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-slate-200'
              }`}
              style={{ backgroundColor: preset.bg }}
            >
              <span
                style={{ color: preset.text, fontSize: 10 }}
                className="font-bold"
              >
                Aa
              </span>
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: preset.accent }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* 배경색 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          배경색
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.backgroundColor}
            onChange={(e) =>
              onChange({ ...design, backgroundColor: e.target.value })
            }
            className="w-10 h-10 rounded cursor-pointer border border-slate-200"
          />
          <input
            type="text"
            value={design.backgroundColor}
            onChange={(e) =>
              onChange({ ...design, backgroundColor: e.target.value })
            }
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
          />
        </div>
      </div>

      {/* 텍스트 색상 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          글자색
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.textColor}
            onChange={(e) =>
              onChange({ ...design, textColor: e.target.value })
            }
            className="w-10 h-10 rounded cursor-pointer border border-slate-200"
          />
          <input
            type="text"
            value={design.textColor}
            onChange={(e) =>
              onChange({ ...design, textColor: e.target.value })
            }
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
          />
        </div>
      </div>

      {/* 강조색 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          강조색
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design.accentColor}
            onChange={(e) =>
              onChange({ ...design, accentColor: e.target.value })
            }
            className="w-10 h-10 rounded cursor-pointer border border-slate-200"
          />
          <input
            type="text"
            value={design.accentColor}
            onChange={(e) =>
              onChange({ ...design, accentColor: e.target.value })
            }
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          소제목, 태그, 숫자 하이라이트에 사용됩니다
        </p>
      </div>

      {/* 폰트 선택 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          폰트
        </label>
        <select
          value={design.fontFamily}
          onChange={(e) => onChange({ ...design, fontFamily: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* 텍스트 정렬 (표지 카드용) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          표지 정렬
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...design, textAlign: 'left' })}
            className={`flex-1 py-2 px-4 text-sm rounded-lg border transition-colors ${
              design.textAlign === 'left'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            좌측 정렬
          </button>
          <button
            onClick={() => onChange({ ...design, textAlign: 'center' })}
            className={`flex-1 py-2 px-4 text-sm rounded-lg border transition-colors ${
              design.textAlign === 'center'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            중앙 정렬
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          본문 카드는 항상 좌측 정렬됩니다
        </p>
      </div>
    </div>
  );
}
