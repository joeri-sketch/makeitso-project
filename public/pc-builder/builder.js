(() => {
  'use strict';

  const i18n = window.i18n || { t: (key) => key, onChange() {} };
  const groups = {
    cpu: {
      title: 'Processor', question: 'Which processor should power your PC?',
      help: 'The processor runs game logic and background tasks. More cores help when you game, stream and multitask at once.',
      options: [
        { id: 'ryzen-5-9600x', name: 'AMD Ryzen 5 9600X', detail: '6 cores · AM5', price: 279, socket: 'AM5' },
        { id: 'ryzen-7-9800x3d', name: 'AMD Ryzen 7 9800X3D', detail: '8 cores · AM5 · Gaming pick', price: 529, socket: 'AM5' },
        { id: 'ryzen-9-9900x', name: 'AMD Ryzen 9 9900X', detail: '12 cores · AM5', price: 439, socket: 'AM5' }
      ]
    },
    gpu: {
      title: 'Graphics card', question: 'How much graphics power do you need?',
      help: 'The graphics card draws your games. A stronger one can deliver sharper detail and smoother frame rates at higher resolutions.',
      options: [
        { id: 'rtx-5060', name: 'NVIDIA GeForce RTX 5060', detail: '8 GB · 1080p gaming', price: 389 },
        { id: 'rtx-5070', name: 'NVIDIA GeForce RTX 5070', detail: '12 GB · 1440p gaming', price: 679 },
        { id: 'rx-9070xt', name: 'AMD Radeon RX 9070 XT', detail: '16 GB · High-performance gaming', price: 779 }
      ]
    },
    motherboard: {
      title: 'Motherboard', question: 'Which motherboard should connect your parts?',
      help: 'The motherboard links the processor, memory and storage. These boards support your chosen CPU and DDR5 memory.',
      options: [
        { id: 'msi-b850', name: 'MSI B850 Gaming Plus WiFi', detail: 'AM5 · Wi-Fi 7 · DDR5', price: 189, socket: 'AM5' },
        { id: 'asus-x870', name: 'ASUS TUF Gaming X870-PLUS', detail: 'AM5 · Wi-Fi 7 · DDR5', price: 269, socket: 'AM5' }
      ]
    },
    memory: {
      title: 'Memory', question: 'How much memory should your PC have?',
      help: 'Memory keeps active games and apps ready. 32 GB suits most gaming; 64 GB gives extra room for heavy multitasking and creation.',
      options: [
        { id: '32gb', name: '32 GB DDR5-6000', detail: '2 × 16 GB · Dual channel', price: 109, type: 'DDR5' },
        { id: '64gb', name: '64 GB DDR5-6000', detail: '2 × 32 GB · Dual channel', price: 199, type: 'DDR5' }
      ]
    },
    storage: {
      title: 'Storage', question: 'How much room do you need for games?',
      help: 'Storage holds your games, apps and files. NVMe SSDs load quickly; choose more capacity for a larger game library.',
      options: [
        { id: '1tb', name: '1 TB NVMe SSD', detail: 'PCIe 4.0 · Up to 7,000 MB/s', price: 89 },
        { id: '2tb', name: '2 TB NVMe SSD', detail: 'PCIe 4.0 · Up to 7,000 MB/s', price: 149 },
        { id: '4tb', name: '4 TB NVMe SSD', detail: 'PCIe 4.0 · Up to 7,000 MB/s', price: 289 }
      ]
    },
    case: {
      title: 'Case colour', question: 'What colour should your case be?',
      help: 'The case protects your components and helps airflow. These colour choices use the same case and cooling layout.',
      options: [
        { id: 'black', name: 'Black', detail: 'Mid-tower · Tempered glass', price: 0, color: '#202338' },
        { id: 'white', name: 'White', detail: 'Mid-tower · Tempered glass', price: 0, color: '#e5e9f4' },
        { id: 'blue', name: 'Blue', detail: 'Mid-tower · Tempered glass', price: 0, color: '#315bff' },
        { id: 'purple', name: 'Purple', detail: 'Mid-tower · Tempered glass', price: 0, color: '#8956e8' }
      ]
    },
    os: {
      title: 'Operating system', question: 'Which operating system would you like?',
      help: 'Windows supports the widest range of PC games and apps. Ubuntu is a free, open-source Linux option; check game compatibility before choosing it.',
      options: [
        { id: 'windows-11-pro', name: 'Windows 11 Pro', detail: 'Licensed and ready to use', price: 159 },
        { id: 'ubuntu-24', name: 'Ubuntu 24.04 LTS', detail: 'Open-source · No licence cost', price: 0 }
      ]
    },
    monitor: {
      title: 'Monitor (optional)', question: 'Would you like to add a monitor?',
      help: 'A higher resolution looks sharper; a higher refresh rate makes motion feel smoother. Choose a display that suits your games and graphics card.',
      options: [
        { id: 'none', name: 'No monitor', detail: 'I already have a display', price: 0 },
        { id: 'qhd-27', name: '27-inch QHD 180 Hz', detail: '1440p · IPS · Adaptive sync', price: 279 },
        { id: 'uhd-32', name: '32-inch 4K 144 Hz', detail: '2160p · IPS · Adaptive sync', price: 549 }
      ]
    }
  };
  const wizardSteps = ['cpu', 'gpu', 'motherboard', 'memory', 'storage', 'case', 'os', 'office', 'monitor'];
  const officeStep = {
    question: 'Do you need Microsoft 365?',
    help: 'Add Microsoft 365 Personal for Word, Excel, PowerPoint and 1 TB of cloud storage. It is an optional annual subscription.'
  };
  const defaults = {
    cpu: 'ryzen-7-9800x3d', gpu: 'rtx-5070', motherboard: 'msi-b850',
    memory: '32gb', storage: '2tb', case: 'black', os: 'windows-11-pro',
    monitor: 'none', office: false
  };
  const storageKey = 'mis-pc-builder-v1';
  const form = document.querySelector('#build-form');
  if (!form) return;

  const state = { ...defaults };
  let currentStep = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const [key] of Object.entries(defaults)) {
      if (key === 'office') state.office = Boolean(saved.office);
      else if (groups[key]?.options.some((option) => option.id === saved[key])) state[key] = saved[key];
    }
  } catch (error) {
    // Continue with the default build when storage is unavailable or invalid.
  }

  const $ = (selector) => document.querySelector(selector);
  const t = (key, vars) => i18n.t(key, vars);
  const find = (group) => groups[group].options.find((option) => option.id === state[group]);
  const locale = () => ({ en: 'en-BE', nl: 'nl-BE', fr: 'fr-BE' }[i18n.lang] || 'en-BE');
  const money = (amount) => new Intl.NumberFormat(locale(), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 2
  }).format(amount);

  function appendOption(target, key, option) {
    const label = document.createElement('label');
    label.className = `builder-option${key === 'case' ? ' builder-color-option' : ''}`;
    label.classList.toggle('is-selected', state[key] === option.id);
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = key;
    input.value = option.id;
    input.checked = state[key] === option.id;
    input.setAttribute('aria-label', `${t(option.name)}, ${money(option.price)}`);
    const copy = document.createElement('span');
    copy.className = 'builder-option-copy';
    const name = document.createElement('strong');
    name.textContent = t(option.name);
    const detail = document.createElement('small');
    detail.textContent = t(option.detail);
    copy.append(name, detail);
    const price = document.createElement('span');
    price.className = 'builder-option-price';
    price.textContent = option.price ? money(option.price) : t('Included');
    label.append(input);
    if (key === 'case') {
      const swatch = document.createElement('i');
      swatch.className = 'builder-swatch';
      swatch.style.setProperty('--swatch', option.color);
      label.append(swatch);
    }
    label.append(copy, price);
    target.append(label);
  }

  function renderStep() {
    const isReview = currentStep === wizardSteps.length;
    const count = wizardSteps.length + 1;
    const progress = $('.pc-stepbar');
    $('#step-count').textContent = t('Step {current} of {total}', { current: currentStep + 1, total: count });
    $('#step-progress').style.width = `${((currentStep + 1) / count) * 100}%`;
    progress.setAttribute('aria-valuenow', String(currentStep + 1));
    $('#step-panel').hidden = isReview;
    $('#review-panel').hidden = !isReview;
    $('#step-actions').hidden = isReview;
    $('.pc-step-meta .pc-kicker').textContent = isReview
      ? `${count.toString().padStart(2, '0')} · ${t('Final check')}`
      : `${String(currentStep + 1).padStart(2, '0')} · ${t('Build components')}`;
    if (isReview) {
      $('#review-eyebrow').textContent = t('Final check');
      renderReview();
      return;
    }

    const key = wizardSteps[currentStep];
    const group = key === 'office' ? officeStep : groups[key];
    $('#step-eyebrow').textContent = t('Part {number}', { number: String(currentStep + 1).padStart(2, '0') });
    $('#step-question').textContent = t(group.question);
    $('#step-help').textContent = t(group.help);
    $('#step-legend').textContent = t(key === 'office' ? 'Optional add-on' : 'Choose one option');
    const target = $('#step-options');
    target.replaceChildren();
    target.classList.toggle('pc-options-colour', key === 'case');
    if (key === 'office') {
      const label = document.createElement('label');
      label.className = `pc-office-option${state.office ? ' is-selected' : ''}`;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'office-toggle';
      input.checked = state.office;
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = t('Add Microsoft 365 Personal');
      const detail = document.createElement('small');
      detail.textContent = t('Word, Excel, PowerPoint and 1 TB cloud storage');
      copy.append(name, detail);
      const price = document.createElement('b');
      price.textContent = `${money(99.99)} / ${t('Per year')}`;
      label.append(input, copy, price);
      target.append(label);
    } else {
      groups[key].options.forEach((option) => appendOption(target, key, option));
    }
    $('#back-step').disabled = currentStep === 0;
    $('#back-step').textContent = `← ${t('Previous')}`;
    $('#next-step').textContent = t(currentStep === wizardSteps.length - 1 ? 'Review your build' : 'Next component');
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    $('#next-step').append(arrow);
  }

  function renderReview() {
    const list = $('#review-items');
    list.replaceChildren();
    ['cpu', 'gpu', 'motherboard', 'memory', 'storage', 'case', 'os', 'monitor'].forEach((key) => {
      const option = find(key);
      if (key === 'monitor' && option.id === 'none') return;
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = t(groups[key].title);
      const value = document.createElement('strong');
      value.textContent = t(option.name);
      row.append(label, value);
      list.append(row);
    });
    $('#review-office').hidden = !state.office;
    $('#review-office').textContent = state.office
      ? `${t('Microsoft 365 Personal')}: ${money(99.99)} / ${t('Per year')}`
      : '';
  }

  function renderSummary() {
    const list = $('#build-summary-items');
    list.replaceChildren();
    let total = 0;
    const summaryGroups = ['cpu', 'gpu', 'motherboard', 'memory', 'storage', 'case', 'os', 'monitor'];
    summaryGroups.forEach((key) => {
      const option = find(key);
      total += option.price;
      if (key === 'monitor' && option.id === 'none') return;
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = t(groups[key].title);
      const value = document.createElement('strong');
      value.textContent = t(option.name);
      row.append(label, value);
      list.append(row);
    });
    $('#build-total').textContent = money(total);
    $('#build-annual').hidden = !state.office;
    $('#build-annual-price').textContent = `${money(99.99)} / ${t('Per year')}`;
    $('#case-preview').style.setProperty('--case-color', find('case').color);
    form.querySelectorAll('.builder-option').forEach((option) => {
      option.classList.toggle('is-selected', option.querySelector('input').checked);
    });
    const officeToggle = $('#office-toggle');
    if (officeToggle) officeToggle.checked = state.office;
    const compatible = find('cpu').socket === find('motherboard').socket && find('memory').type === 'DDR5';
    const compatibility = $('#compatibility-status');
    compatibility.textContent = t(compatible ? 'All selected parts are compatible' : 'Some selected parts need review');
    compatibility.classList.toggle('is-compatible', compatible);
    compatibility.classList.toggle('is-warning', !compatible);
    const itemLines = summaryGroups.map((key) => `${t(groups[key].title)}: ${t(find(key).name)} (${money(find(key).price)})`);
    const mailBody = [
      t('Hello, I would like a quote for this custom PC build:'),
      '', ...itemLines, '', `${t('Estimated total')}: ${money(total)}`,
      state.office ? `${t('Microsoft 365 Personal')} · ${t('Annual subscription')}: ${money(99.99)} / ${t('Per year')}` : '',
      '', t('Please confirm availability and final pricing.')
    ].filter(Boolean).join('\n');
    $('#review-request').href = `mailto:hello@makeitso.studio?subject=${encodeURIComponent(t('Custom gaming PC build request'))}&body=${encodeURIComponent(mailBody)}`;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* Storage is optional. */ }
  }

  function render() {
    renderStep();
    renderSummary();
  }
  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name && Object.hasOwn(groups, input.name)) state[input.name] = input.value;
    if (input.id === 'office-toggle') state.office = input.checked;
    form.querySelectorAll('.builder-option, .pc-office-option').forEach((option) => {
      option.classList.toggle('is-selected', Boolean(option.querySelector('input')?.checked));
    });
    renderSummary();
  });
  $('#next-step').addEventListener('click', () => {
    currentStep = Math.min(currentStep + 1, wizardSteps.length);
    render();
    (currentStep === wizardSteps.length ? $('#review-title') : $('#step-question')).focus();
  });
  $('#review-back').addEventListener('click', () => {
    currentStep = wizardSteps.length - 1;
    render();
    $('#step-question').focus();
  });
  $('#back-step').addEventListener('click', () => {
    currentStep = Math.max(0, currentStep - 1);
    render();
    $('#step-question').focus();
  });
  $('#reset-build').addEventListener('click', () => {
    Object.assign(state, defaults);
    currentStep = 0;
    render();
    $('#step-question').focus();
  });
  i18n.onChange(render);
  render();
})();
