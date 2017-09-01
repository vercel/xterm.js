import { IDataRenderLayer } from './Interfaces';
import { IBuffer, ICharMeasure, ITerminal } from '../Interfaces';
import { CHAR_DATA_ATTR_INDEX, CHAR_DATA_CODE_INDEX, CHAR_DATA_CHAR_INDEX, CHAR_DATA_WIDTH_INDEX } from '../Buffer';
import { COLORS } from './Color';
import { FLAGS } from './Types';
import { GridCache } from './GridCache';
import { CharData } from '../Types';
import { BaseRenderLayer } from './BaseRenderLayer';

export class ForegroundRenderLayer extends BaseRenderLayer implements IDataRenderLayer {
  private _state: GridCache<CharData>;

  constructor(container: HTMLElement, zIndex: number) {
    super(container, 'fg', zIndex);
    this._state = new GridCache<CharData>();
  }

  public resize(terminal: ITerminal, canvasWidth: number, canvasHeight: number, charSizeChanged: boolean): void {
    super.resize(terminal, canvasWidth, canvasHeight, charSizeChanged);
    this._state.resize(terminal.cols, terminal.rows);
  }

  public reset(terminal: ITerminal): void {
    this._state.clear();
    this.clearAll();
  }

  public render(terminal: ITerminal, startRow: number, endRow: number): void {
    // TODO: Ensure that the render is eventually performed
    // Don't bother render until the atlas bitmap is ready
    // TODO: Move this to BaseRenderLayer?
    // if (!BaseRenderLayer._charAtlas) {
    //   return;
    // }

    for (let y = startRow; y <= endRow; y++) {
      const row = y + terminal.buffer.ydisp;
      const line = terminal.buffer.lines.get(row);

      for (let x = 0; x < terminal.cols; x++) {
        const charData = line[x];
        const code: number = <number>charData[CHAR_DATA_CODE_INDEX];
        const char: string = charData[CHAR_DATA_CHAR_INDEX];
        const attr: number = charData[CHAR_DATA_ATTR_INDEX];

        // Skip rendering if the character is identical
        const state = this._state.cache[x][y];
        if (state && state[CHAR_DATA_CHAR_INDEX] === char && state[CHAR_DATA_ATTR_INDEX] === attr) {
          // Skip render, contents are identical
          this._state.cache[x][y] = charData;
          continue;
        }
        this._state.cache[x][y] = charData;

        // Clear the old character
        this.clearCells(x, y, 1, 1);

        // Skip rendering if the character is invisible
        if (!code || code === 32 /*' '*/) {
          continue;
        }

        let fg = (attr >> 9) & 0x1ff;
        const flags = attr >> 18;

        // If inverse flag is on, the foreground should become the background.
        if (flags & FLAGS.INVERSE) {
          fg = attr & 0x1ff;
          // TODO: Is this case still needed
          if (fg === 257) {
            fg = 0;
          }
        }

        this._ctx.save();
        if (flags & FLAGS.BOLD) {
          this._ctx.font = `bold ${this._ctx.font}`;
          // Convert the FG color to the bold variant
          if (fg < 8) {
            fg += 8;
          }
        }

        this.drawChar(terminal, char, code, fg, x, y);
        this._ctx.restore();
      }
    }
  }
}
