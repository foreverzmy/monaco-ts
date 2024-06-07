export class Button {
  #el: HTMLButtonElement;
  #callbacks: Array<() => void> = [];

  constructor(id: string) {
    this.#el = document.getElementById(id) as HTMLButtonElement;

    this.#el.addEventListener('click', () => { 
      this.#callbacks.forEach(cb => cb());
    });
  }

  disable = () => {
    this.#el.disabled = true;
  }

  enable = () => {
    this.#el.disabled = false;
  }

  onClick = (cb: () => void) => {
    this.#callbacks.push(cb);
  }
}