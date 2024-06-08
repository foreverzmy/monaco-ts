type Options = { label: string, value: string };

export class Select {
  #el: HTMLSelectElement;
  #value: string;
  #options: Options[] = [];
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
    if (this.#value === value) {
      return;
    }
    this.#el.value = value;
    this.#value = value;
    this.#callbacks.forEach(cb => cb(this.#el.value));
  }

  get options() {
    if (this.#options.length) {
      return this.#options;
    }
    this.#options = Array.from(this.#el.options)
      .map(({ label, value }: HTMLOptionElement) => ({
      label, value
    }));

    return this.#options;
  }

  set options(options: Array<Options>) {
    this.updateOptions(options);
  }

  onChange = (cb: (value: string) => void) => {
    this.#callbacks.push(cb);
  }

  updateOptions = (options: Array<Options>) => {
    this.#options = options;
    this.#el.innerHTML = '';
    options.forEach(option => {
      const newOption = document.createElement('option');
      newOption.value = option.value;
      newOption.text = option.label;
      this.#el.appendChild(newOption);
    });
  }
}
