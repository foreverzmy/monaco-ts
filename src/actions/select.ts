export class Select {
  #el: HTMLSelectElement;
  #value: string;
  #callbacks: Array<(value: string) => void> = [];

  constructor(id: string) {
    this.#el = document.getElementById(id) as HTMLSelectElement;
    this.#value = this.#el.value;

    this.#el.addEventListener('change', () => { 
      this.#value = this.#el.value;
      this.#callbacks.forEach(cb => cb(this.#el.value));
    });
  }

  get value() {
    return this.#value;
  }

  set value(value: string) {
    this.#el.value = value;
    this.#value = value;
    this.#callbacks.forEach(cb => cb(this.#el.value));
  }

  onChange = (cb: (value: string) => void) => {
    this.#callbacks.push(cb);
  }

  updateOptions = (options: Array<{ label: string, value: string }>) => {
    this.#el.innerHTML = '';
    options.forEach(option => {
      const newOption = document.createElement('option');
      newOption.value = option.value;
      newOption.text = option.label;
      this.#el.appendChild(newOption);
    });
  }
}
