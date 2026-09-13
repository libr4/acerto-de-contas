import {
  useRef,
  useState,
  useEffect,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

interface AnswerInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

interface PadOffset {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: PadOffset;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function AnswerInput({ inputRef, value, disabled, onChange, onSubmit }: AnswerInputProps) {
  const [padOffset, setPadOffset] = useState<PadOffset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const padRef = useRef<HTMLElement>(null);
  const dragState = useRef<DragState | null>(null);
  const viewportWidth = useRef(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      if (Math.abs(window.innerWidth - viewportWidth.current) > 24) {
        setPadOffset({ x: 0, y: 0 });
      }
      viewportWidth.current = window.innerWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const appendDigit = (digit: string) => {
    if (!disabled && value.length < 7) onChange(`${value}${digit}`);
  };

  const eraseDigit = () => {
    if (!disabled) onChange(value.slice(0, -1));
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    const arena = pad?.closest<HTMLElement>('.arena');
    if (!pad || !arena) return;

    const padRect = pad.getBoundingClientRect();
    const arenaRect = arena.getBoundingClientRect();
    const baseLeft = padRect.left - padOffset.x;
    const baseTop = padRect.top - padOffset.y;
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: padOffset,
      minX: arenaRect.left - baseLeft,
      maxX: arenaRect.right - baseLeft - padRect.width,
      minY: arenaRect.top - baseTop,
      maxY: arenaRect.bottom - baseTop - padRect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    event.preventDefault();
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPadOffset({
      x: Math.max(drag.minX, Math.min(drag.maxX, drag.origin.x + event.clientX - drag.startX)),
      y: Math.max(drag.minY, Math.min(drag.maxY, drag.origin.y + event.clientY - drag.startY)),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    setDragging(false);
  };

  return (
    <div className={`answer-console ${disabled ? 'answer-console--disabled' : ''}`}>
      <section
        ref={padRef}
        className={`answer-console__pad ${dragging ? 'answer-console__pad--dragging' : ''}`}
        style={{ transform: `translate3d(${padOffset.x}px, ${padOffset.y}px, 0)` }}
        aria-label="Number keypad"
      >
        <div
          className="answer-console__drag-handle"
          title="Drag to move keypad"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="answer-console__prompt">SOLUTION</span>
          <span className="answer-console__rule" />
          <span className="answer-console__grip" aria-hidden="true">•••</span>
        </div>
        <div className="answer-console__field">
          <span aria-hidden="true">›</span>
          <input
            ref={inputRef}
            id="answer"
            aria-label="Current answer"
            autoComplete="off"
            autoFocus
            disabled={disabled}
            maxLength={7}
            placeholder="—"
            readOnly
            value={value}
            onBlur={() => {
              if (!disabled) window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                onSubmit();
                return;
              }
              if (/^\d$/.test(event.key)) {
                event.preventDefault();
                appendDigit(event.key);
                return;
              }
              if (event.key === 'Backspace') {
                event.preventDefault();
                eraseDigit();
                return;
              }
              if (event.key !== 'Tab') event.preventDefault();
            }}
          />
        </div>
        <div className="answer-console__keys">
          {KEYPAD_KEYS.map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={disabled}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => appendDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            className="answer-console__key--utility"
            type="button"
            aria-label="Clear answer"
            disabled={disabled}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onChange('')}
          >
            C
          </button>
          <button
            type="button"
            disabled={disabled}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => appendDigit('0')}
          >
            0
          </button>
          <button
            className="answer-console__key--utility"
            type="button"
            aria-label="Delete last digit"
            disabled={disabled}
            onPointerDown={(event) => event.preventDefault()}
            onClick={eraseDigit}
          >
            ⌫
          </button>
        </div>
      </section>
      <button
        className="answer-console__shoot"
        type="button"
        aria-label="Shoot answer"
        disabled={disabled || value.length === 0}
        onPointerDown={(event) => event.preventDefault()}
        onClick={onSubmit}
      >
        <span className="answer-console__reticle" aria-hidden="true" />
        <small>FIRE</small>
      </button>
    </div>
  );
}
