// UI strings. English is the source; pt is Brazilian Portuguese.

const STRINGS = {
  en: {
    focus: 'Focus', short: 'Short break', long: 'Long break',
    round: 'Round {n} of {total}',
    start: 'Start', pause: 'Pause', resume: 'Resume', skip: 'Skip', restart: 'Restart phase',
    resetAll: 'Reset session',
    nextBreak: 'Next break', nextCircuit: 'Next long break starts a circuit',
    timer: 'Timer', stats: 'Stats', settings: 'Settings',
    sets: '{sets} × {amount}', reps: 'reps', secs: 's', perSide: 'each side',
    setDone: 'Set done', startSet: 'Start set', swap: 'Swap',
    resetSets: 'Reset', resetSetsHint: 'Clear the sets of this exercise', setOf: 'Set {n} of {total}',
    allSetsDone: 'All sets done!',
    exerciseN: 'Exercise {n}', nextUp: 'Suggested next',
    chooseNext: 'Nice work! Pick the next one', moreOptions: 'Other options',
    doneThisBreak: '{n} done this break', circuitNext: 'Circuit',
    breakOver: 'Break over. Ready to focus?',
    noEquipment: 'Pick at least one kind of equipment in Settings.',
    // stats
    today: 'Today', pomodoros: 'Pomodoros', focusMin: 'Focus min', exercises: 'Exercises',
    repsTotal: 'Reps', streak: 'Day streak', last7: 'Last 7 days',
    pomodorosPerDay: 'Pomodoros per day', exercisesPerDay: 'Exercises per day',
    topExercises: 'Most done', allTime: 'All time', nothingYet: 'Nothing yet. Finish a focus session to start your history.',
    clearStats: 'Clear history', clearConfirm: 'Delete all history?', clearDetail: 'Pomodoros and exercises will be erased. This cannot be undone.',
    times: '{n}×',
    // settings
    sTimer: 'Timer', focusLen: 'Focus', shortLen: 'Short break', longLen: 'Long break', roundsLen: 'Rounds',
    min: 'min',
    sBehavior: 'Behavior', autoStartBreak: 'Auto-start breaks', autoStartWork: 'Auto-start focus',
    autoStartOnLaunch: 'Start timer when the app opens', showOnBreak: 'Bring window forward on breaks',
    alwaysOnTop: 'Always on top', notifications: 'Desktop notifications',
    minimizeToTrayOnClose: 'Close button hides to tray', startMinimized: 'Start minimized',
    launchAtLogin: 'Launch at login',
    sSound: 'Sound', muted: 'Mute', volume: 'Volume', tickWork: 'Tick during focus', tickBreak: 'Tick during breaks',
    sExercise: 'Exercises', equipment: 'Equipment I have', circuitSize: 'Long-break circuit',
    eq_dumbbell: 'Dumbbells', eq_bar: 'Pull-up bar', eq_rope: 'Jump rope', eq_body: 'Bodyweight',
    sAppearance: 'Appearance', theme: 'Theme', themeSystem: 'System', themeDark: 'Dark', themeLight: 'Light',
    language: 'Language', langAuto: 'Automatic',
    sAbout: 'About',
    aboutText: 'Pomodoro timer with active breaks: every pause is a chain of compound exercises you can do with dumbbells, a pull-up bar, a jump rope or your own body.',
    aboutBy: 'Built by {author} at Arvucore. Free and open source.',
    healthNote: 'Move within your limits. If something hurts, stop.',
    buyCoffee: 'Buy me a coffee ☕',
    updateAvailable: 'Version {v} is available', update: 'Update', later: 'Later',
    updating: 'Updating…', updateFailed: 'Update failed: {msg}',
    updateConfirm: 'Update now?', updateDetail: 'The running timer will stop while Arvudoro restarts.',
    groups: { full: 'Full body', lower: 'Legs', upper: 'Upper body', posterior: 'Posterior chain', core: 'Core', cardio: 'Cardio' },
  },
  pt: {
    focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa',
    round: 'Rodada {n} de {total}',
    start: 'Iniciar', pause: 'Pausar', resume: 'Continuar', skip: 'Pular', restart: 'Reiniciar etapa',
    resetAll: 'Reiniciar sessão',
    nextBreak: 'Próxima pausa', nextCircuit: 'A próxima pausa longa começa um circuito',
    timer: 'Timer', stats: 'Estatísticas', settings: 'Ajustes',
    sets: '{sets} × {amount}', reps: 'reps', secs: 's', perSide: 'cada lado',
    setDone: 'Série feita', startSet: 'Iniciar série', swap: 'Trocar',
    resetSets: 'Zerar', resetSetsHint: 'Apaga as séries deste exercício', setOf: 'Série {n} de {total}',
    allSetsDone: 'Todas as séries feitas!',
    exerciseN: 'Exercício {n}', nextUp: 'Sugestão a seguir',
    chooseNext: 'Mandou bem! Escolha o próximo', moreOptions: 'Outras opções',
    doneThisBreak: '{n} feitos nesta pausa', circuitNext: 'Circuito',
    breakOver: 'Pausa encerrada. Pronto para focar?',
    noEquipment: 'Escolha pelo menos um tipo de equipamento nos Ajustes.',
    today: 'Hoje', pomodoros: 'Pomodoros', focusMin: 'Min de foco', exercises: 'Exercícios',
    repsTotal: 'Reps', streak: 'Dias seguidos', last7: 'Últimos 7 dias',
    pomodorosPerDay: 'Pomodoros por dia', exercisesPerDay: 'Exercícios por dia',
    topExercises: 'Mais feitos', allTime: 'Desde o início', nothingYet: 'Nada ainda. Termine uma sessão de foco para começar seu histórico.',
    clearStats: 'Apagar histórico', clearConfirm: 'Apagar todo o histórico?', clearDetail: 'Pomodoros e exercícios serão apagados. Não dá para desfazer.',
    times: '{n}×',
    sTimer: 'Timer', focusLen: 'Foco', shortLen: 'Pausa curta', longLen: 'Pausa longa', roundsLen: 'Rodadas',
    min: 'min',
    sBehavior: 'Comportamento', autoStartBreak: 'Iniciar pausas automaticamente', autoStartWork: 'Iniciar foco automaticamente',
    autoStartOnLaunch: 'Iniciar o timer ao abrir o app', showOnBreak: 'Trazer a janela para frente nas pausas',
    alwaysOnTop: 'Sempre no topo', notifications: 'Notificações',
    minimizeToTrayOnClose: 'Fechar esconde na bandeja', startMinimized: 'Iniciar minimizado',
    launchAtLogin: 'Abrir ao iniciar o sistema',
    sSound: 'Som', muted: 'Mudo', volume: 'Volume', tickWork: 'Tique durante o foco', tickBreak: 'Tique durante as pausas',
    sExercise: 'Exercícios', equipment: 'Equipamentos que eu tenho', circuitSize: 'Circuito da pausa longa',
    eq_dumbbell: 'Halteres', eq_bar: 'Barra fixa', eq_rope: 'Corda de pular', eq_body: 'Peso do corpo',
    sAppearance: 'Aparência', theme: 'Tema', themeSystem: 'Sistema', themeDark: 'Escuro', themeLight: 'Claro',
    language: 'Idioma', langAuto: 'Automático',
    sAbout: 'Sobre',
    aboutText: 'Timer pomodoro com pausas ativas: em cada pausa você emenda exercícios compostos com halteres, barra fixa, corda de pular ou o próprio corpo.',
    aboutBy: 'Criado por {author} na Arvucore. Gratuito e de código aberto.',
    healthNote: 'Respeite seus limites. Se sentir dor, pare.',
    buyCoffee: 'Me pague um café ☕',
    updateAvailable: 'A versão {v} está disponível', update: 'Atualizar', later: 'Depois',
    updating: 'Atualizando…', updateFailed: 'Falha ao atualizar: {msg}',
    updateConfirm: 'Atualizar agora?', updateDetail: 'O timer em andamento vai parar enquanto o Arvudoro reinicia.',
    groups: { full: 'Corpo inteiro', lower: 'Pernas', upper: 'Membros superiores', posterior: 'Cadeia posterior', core: 'Core', cardio: 'Cardio' },
  },
};

let lang = 'en';

export function resolveLang(setting) {
  if (setting === 'en' || setting === 'pt') return setting;
  return (navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export function setLang(l) { lang = l; document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en'; }
export function getLang() { return lang; }

export function t(key, vars) {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}

// fill every [data-i18n] element in the static markup
export function translateDom(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
}
