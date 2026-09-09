import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loader-container" [class.full-screen]="fullScreen()">
      <div class="boxes">
          <div class="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
          </div>
          <div class="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
          </div>
          <div class="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
          </div>
          <div class="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
          </div>
      </div>
      @if (text()) {
        <div class="loader-text">{{ text() }}</div>
      }
    </div>
  `,
  styles: [`
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-4);
      padding: var(--space-6);
      min-height: 60vh;
    }

    .loader-container.full-screen {
      position: fixed;
      inset: 0;
      background: var(--surface-primary);
      z-index: 9999;
    }

    .loader-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-weight: var(--weight-medium);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .boxes {
      --size: 32px;
      --duration: 800ms;
      height: calc(var(--size) * 2);
      width: calc(var(--size) * 3);
      position: relative;
      transform-style: preserve-3d;
      transform-origin: 50% 50%;
      margin-top: calc(var(--size) * 1.5 * -1);
      transform: rotateX(60deg) rotateZ(45deg) rotateY(0deg) translateZ(0px);
    }

    .boxes .box {
      width: var(--size);
      height: var(--size);
      top: 0;
      left: 0;
      position: absolute;
      transform-style: preserve-3d;
    }

    .boxes .box:nth-child(1) {
      transform: translate(100%, 0);
      animation: box1 var(--duration) linear infinite;
    }

    .boxes .box:nth-child(2) {
      transform: translate(0, 100%);
      animation: box2 var(--duration) linear infinite;
    }

    .boxes .box:nth-child(3) {
      transform: translate(100%, 100%);
      animation: box3 var(--duration) linear infinite;
    }

    .boxes .box:nth-child(4) {
      transform: translate(200%, 0);
      animation: box4 var(--duration) linear infinite;
    }

    .boxes .box > div {
      --background: var(--color-orange);
      --top: auto;
      --right: auto;
      --bottom: auto;
      --left: auto;
      --translateZ: calc(var(--size) / 2);
      --rotateY: 0deg;
      --rotateX: 0deg;
      position: absolute;
      width: 100%;
      height: 100%;
      background: var(--background);
      top: var(--top);
      right: var(--right);
      bottom: var(--bottom);
      left: var(--left);
      transform: rotateY(var(--rotateY)) rotateX(var(--rotateX)) translateZ(var(--translateZ));
    }

    .boxes .box > div:nth-child(1) {
      --top: 0;
      --left: 0;
    }

    .boxes .box > div:nth-child(2) {
      --background: var(--color-orange-active);
      --right: 0;
      --rotateY: 90deg;
    }

    .boxes .box > div:nth-child(3) {
      --background: var(--color-orange-hover);
      --rotateX: -90deg;
    }

    .boxes .box > div:nth-child(4) {
      --background: var(--color-beige);
      --top: 0;
      --left: 0;
      --translateZ: calc(var(--size) * 3 * -1);
    }

    /* Dark mode override for the lighter side */
    [data-theme="dark"] .boxes .box > div:nth-child(4) {
      --background: var(--color-gray-800);
    }

    @keyframes box1 {
      0%, 50% { transform: translate(100%, 0); }
      100% { transform: translate(200%, 0); }
    }

    @keyframes box2 {
      0% { transform: translate(0, 100%); }
      50% { transform: translate(0, 0); }
      100% { transform: translate(100%, 0); }
    }

    @keyframes box3 {
      0%, 50% { transform: translate(100%, 100%); }
      100% { transform: translate(0, 100%); }
    }

    @keyframes box4 {
      0% { transform: translate(200%, 0); }
      50% { transform: translate(200%, 100%); }
      100% { transform: translate(100%, 100%); }
    }
  `]
})
export class LoaderComponent {
  fullScreen = input(false);
  text = input<string>();
}
