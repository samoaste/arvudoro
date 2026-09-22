// Exercise catalog. Every move is compound (several joints, several muscle
// groups) and needs at most dumbbells, a pull-up bar, a jump rope or the body.
//
// Each entry: id, name/cues {en, pt}, equipment, group (rotation bucket),
// mode 'reps' | 'time', sets × amount, perSide, and the rig keyframes.
// Frames: { p: pose, d: move ms to the next frame, hold?: ms }.

import { pose } from './rig.js';

// ── shared poses ────────────────────────────────────────────────────────────

const RACK = { aR: [22, 148], aL: [18, 148] };             // bells at the shoulders
const OVER = { aR: [174, 4], aL: [170, 4] };               // locked out overhead
const HANG = { aR: [4, 8], aL: [-2, 8] };

const stand = (o = {}) => pose(o);
const squat = (o = {}) => pose({ t: 148, lR: [84, 114], lL: [80, 112], fR: 90, fL: 90, ...o });
const hinge = (o = {}) => pose({ t: 102, lR: [16, 22], lL: [12, 22], aR: [0, 4], aL: [-2, 4], ...o });
// straight-arm plank: toes, hips and shoulders in one line
const plank = (o = {}) => pose({ t: 114, lR: [-66, 0], lL: [-66, 0], fR: 24, fL: 24, aR: [0, 0], aL: [2, 0], h: -10, ...o });
const pushBottom = (o = {}) => pose({ t: 102, lR: [-78, 0], lL: [-78, 0], fR: 12, fL: 12, aR: [-78, 78], aL: [-76, 76], h: -10, ...o });
const floorSquat = (o = {}) => pose({ t: 128, lR: [78, 128], lL: [74, 126], aR: [16, 0], aL: [12, 0], h: -20, ...o });
const rowR = { aR: [-112, 112] };
const rowL = { aL: [-112, 112] };

const F = (p, d, hold = 0) => ({ p, d, hold });

export const EXERCISES = [
  // ── dumbbells ─────────────────────────────────────────────────────────────
  {
    id: 'squat-press',
    name: { en: 'Squat press', pt: 'Agachamento com desenvolvimento' },
    equipment: 'dumbbell', group: 'full', mode: 'reps', sets: 3, amount: 10,
    cues: {
      en: ['Bells at the shoulders, elbows forward', 'Sit back until thighs are parallel', 'Drive up and press overhead in one motion'],
      pt: ['Halteres nos ombros, cotovelos à frente', 'Desça até as coxas ficarem paralelas ao chão', 'Suba e empurre acima da cabeça num só movimento'],
    },
    props: ['db2'],
    frames: [
      F(stand(RACK), 800, 200),
      F(squat({ aR: [40, 140], aL: [36, 140] }), 650, 150),
      F(stand(RACK), 550),
      F(stand(OVER), 650, 300),
    ],
  },
  {
    id: 'lunge-curl',
    name: { en: 'Reverse lunge + curl', pt: 'Afundo reverso + rosca' },
    equipment: 'dumbbell', group: 'lower', mode: 'reps', sets: 3, amount: 8, perSide: true,
    cues: {
      en: ['Step back and drop the back knee toward the floor', 'Front shin stays vertical', 'Stand up and curl at the top'],
      pt: ['Dê um passo para trás e leve o joelho de trás em direção ao chão', 'A canela da frente fica na vertical', 'Suba e faça a rosca no topo'],
    },
    props: ['db2'],
    frames: [
      F(stand(HANG), 700, 150),
      F(pose({ t: 178, lR: [80, 80], lL: [-8, 86], fL: 18, ...HANG }), 700, 150),
      F(stand(HANG), 550),
      F(stand({ aR: [10, 138], aL: [6, 138] }), 600, 250),
    ],
  },
  {
    id: 'rdl-rear-raise',
    name: { en: 'RDL + rear delt raise', pt: 'Stiff (RDL) + crucifixo invertido' },
    equipment: 'dumbbell', group: 'posterior', mode: 'reps', sets: 3, amount: 10,
    cues: {
      en: ['Soft knees, push the hips back, flat back', 'Bells slide down the thighs to mid-shin', 'At the bottom, open the arms out to the sides'],
      pt: ['Joelhos levemente flexionados, quadril para trás, costas retas', 'Halteres deslizam pelas coxas até o meio da canela', 'Embaixo, abra os braços para os lados'],
    },
    props: ['db2'],
    frames: [
      F(stand(HANG), 900, 150),
      F(hinge(), 450, 100),
      F(hinge({ aR: [0, 14], aL: [-2, 14], sR: 0.32, sL: 0.32 }), 450, 250),
      F(hinge(), 800),
    ],
  },
  {
    id: 'gorilla-row',
    name: { en: 'Gorilla row', pt: 'Remada gorila' },
    equipment: 'dumbbell', group: 'upper', mode: 'reps', sets: 3, amount: 8, perSide: true,
    cues: {
      en: ['Wide stance, deep hinge, bells between the feet', 'Row one bell to the hip while the other stays planted', 'Alternate sides without rotating the torso'],
      pt: ['Base larga, quadril bem para trás, halteres entre os pés', 'Puxe um halter até o quadril enquanto o outro fica no chão', 'Alterne os lados sem girar o tronco'],
    },
    props: ['db2'],
    frames: [
      F(hinge({ t: 104, lR: [38, 58], lL: [34, 58], aR: [4, 0], aL: [0, 0] }), 500, 100),
      F(hinge({ t: 104, lR: [38, 58], lL: [34, 58], aL: [0, 0], ...rowR }), 500, 200),
      F(hinge({ t: 104, lR: [38, 58], lL: [34, 58], aR: [4, 0], aL: [0, 0] }), 500, 100),
      F(hinge({ t: 104, lR: [38, 58], lL: [34, 58], aR: [4, 0], ...rowL }), 500, 200),
    ],
  },
  {
    id: 'thruster',
    name: { en: 'Thruster', pt: 'Thruster' },
    equipment: 'dumbbell', group: 'full', mode: 'reps', sets: 3, amount: 10,
    cues: {
      en: ['Front squat with the bells on the shoulders', 'Use the leg drive to launch the press', 'Lower the bells as you sit into the next rep'],
      pt: ['Agachamento com os halteres apoiados nos ombros', 'Use o impulso das pernas para empurrar os halteres', 'Traga os halteres de volta enquanto desce para a próxima'],
    },
    props: ['db2'],
    frames: [
      F(squat({ aR: [40, 140], aL: [36, 140] }), 600, 100),
      F(stand(OVER), 650, 200),
      F(stand(RACK), 500),
    ],
  },
  {
    id: 'renegade-row',
    name: { en: 'Push-up + renegade row', pt: 'Flexão + remada renegada' },
    equipment: 'dumbbell', group: 'core', mode: 'reps', sets: 3, amount: 6, perSide: true,
    cues: {
      en: ['High plank on the bells, feet wide for balance', 'One push-up, then row each side', 'Squeeze glutes so the hips stay square'],
      pt: ['Prancha alta sobre os halteres, pés afastados para equilibrar', 'Uma flexão, depois uma remada de cada lado', 'Contraia os glúteos para o quadril não girar'],
    },
    props: ['db2'],
    anchor: 'haR',
    frames: [
      F(plank(), 600, 100),
      F(pushBottom(), 600, 100),
      F(plank(), 500, 100),
      F(plank(rowR), 500, 150),
      F(plank(), 500, 100),
      F(plank(rowL), 500, 150),
    ],
  },
  {
    id: 'man-maker',
    name: { en: 'Man maker', pt: 'Man maker' },
    equipment: 'dumbbell', group: 'full', mode: 'reps', sets: 3, amount: 5,
    cues: {
      en: ['Push-up and a row on each side', 'Jump the feet in and clean the bells to the shoulders', 'Press overhead, then back down to the plank'],
      pt: ['Flexão e uma remada de cada lado', 'Traga os pés para perto das mãos e suba os halteres até os ombros', 'Empurre acima da cabeça e volte para a prancha'],
    },
    props: ['db2'],
    anchor: 'haR',
    frames: [
      F(plank(), 550, 80),
      F(pushBottom(), 550, 80),
      F(plank(), 450, 80),
      F(plank(rowR), 450, 120),
      F(plank(), 450, 60),
      F(plank(rowL), 450, 120),
      F(plank(), 500, 60),
      F(floorSquat(), 550, 80),
      F(stand(RACK), 500, 80),
      F(stand(OVER), 600, 200),
      F(stand(RACK), 550),
      F(floorSquat(), 600),
    ],
  },
  {
    id: 'db-swing',
    name: { en: 'Dumbbell swing', pt: 'Swing com halter' },
    equipment: 'dumbbell', group: 'posterior', mode: 'reps', sets: 3, amount: 15,
    cues: {
      en: ['Hold one bell by the top with both hands', 'Hike it back between the legs, hips back', 'Snap the hips forward and float it to chest height'],
      pt: ['Segure um halter pela ponta com as duas mãos', 'Leve-o para trás entre as pernas, quadril para trás', 'Estenda o quadril com força e deixe o halter subir até a altura do peito'],
    },
    props: ['db1'],
    frames: [
      F(hinge({ t: 112, lR: [26, 40], lL: [22, 40], aR: [-24, 0], aL: [-26, 0] }), 550, 60),
      F(stand({ aR: [88, 0], aL: [86, 0] }), 550, 80),
    ],
  },
  {
    id: 'db-snatch',
    name: { en: 'Single-arm dumbbell snatch', pt: 'Arranco unilateral com halter' },
    equipment: 'dumbbell', group: 'full', mode: 'reps', sets: 3, amount: 6, perSide: true,
    cues: {
      en: ['Bell on the floor between the feet, hinge and grab it', 'Explode through the legs and pull the bell close to the body', 'Punch it overhead and lock the elbow'],
      pt: ['Halter no chão entre os pés, flexione o quadril e segure', 'Exploda com as pernas e puxe o halter rente ao corpo', 'Soque para cima e trave o cotovelo'],
    },
    props: ['dbR'],
    frames: [
      F(floorSquat({ t: 118, lR: [60, 90], lL: [56, 90], aR: [6, 0], aL: [8, 10] }), 450, 150),
      F(stand({ aR: [100, 70], aL: [-10, 20] }), 280),
      F(stand({ aR: [176, 2], aL: [-8, 14] }), 700, 300),
      F(stand({ aR: [30, 130], aL: [-8, 14] }), 600),
    ],
  },
  {
    id: 'clean-press',
    name: { en: 'Clean & press', pt: 'Clean e desenvolvimento' },
    equipment: 'dumbbell', group: 'full', mode: 'reps', sets: 3, amount: 8,
    cues: {
      en: ['Hinge with the bells beside the knees', 'Pop the hips and flip the bells to the shoulders', 'Press overhead, lower to the shoulders, then the knees'],
      pt: ['Flexione o quadril com os halteres ao lado dos joelhos', 'Estenda o quadril com força e gire os halteres até os ombros', 'Empurre acima da cabeça, desça até os ombros e depois até os joelhos'],
    },
    props: ['db2'],
    frames: [
      F(hinge({ t: 118, lR: [36, 50], lL: [32, 50] }), 450, 150),
      F(squat({ t: 170, lR: [30, 44], lL: [26, 44], ...RACK }), 350),
      F(stand(RACK), 600, 100),
      F(stand(OVER), 650, 250),
      F(stand(RACK), 700),
    ],
  },
  {
    id: 'sl-rdl-row',
    name: { en: 'Single-leg RDL + row', pt: 'Stiff unilateral + remada' },
    equipment: 'dumbbell', group: 'posterior', mode: 'reps', sets: 3, amount: 8, perSide: true,
    cues: {
      en: ['Stand on one leg, bell in the opposite hand', 'Hinge until torso and back leg are level', 'Row the bell to the hip, then stand tall'],
      pt: ['Apoie-se em uma perna, halter na mão oposta', 'Incline até o tronco e a perna de trás ficarem alinhados', 'Puxe o halter até o quadril e volte à posição em pé'],
    },
    props: ['dbR'],
    frames: [
      F(stand({ lL: [-6, 30], fL: 60 }), 800, 150),
      F(pose({ t: 96, lR: [10, 16], lL: [-80, 0], fL: 0, aR: [0, 0], aL: [10, 10] }), 450, 100),
      F(pose({ t: 96, lR: [10, 16], lL: [-80, 0], fL: 0, aL: [10, 10], ...rowR }), 450, 200),
      F(pose({ t: 96, lR: [10, 16], lL: [-80, 0], fL: 0, aR: [0, 0], aL: [10, 10] }), 750),
    ],
  },

  // ── bodyweight ────────────────────────────────────────────────────────────
  {
    id: 'burpee',
    name: { en: 'Burpee', pt: 'Burpee' },
    equipment: 'body', group: 'cardio', mode: 'reps', sets: 3, amount: 10,
    cues: {
      en: ['Squat and plant the hands', 'Jump back to a plank and do a push-up', 'Jump the feet in and leap up with arms overhead'],
      pt: ['Agache e apoie as mãos no chão', 'Salte para a prancha e faça uma flexão', 'Traga os pés de volta e salte com os braços para cima'],
    },
    anchor: 'haR',
    frames: [
      F(stand(), 400),
      F(floorSquat(), 300, 60),
      F(plank(), 400, 60),
      F(pushBottom(), 400, 60),
      F(plank(), 320, 60),
      F(floorSquat(), 380),
      F(stand({ ...OVER, dy: 26, fR: 30, fL: 30 }), 380),
    ],
  },
  {
    id: 'jump-squat',
    name: { en: 'Jump squat', pt: 'Agachamento com salto' },
    equipment: 'body', group: 'lower', mode: 'reps', sets: 3, amount: 12,
    cues: {
      en: ['Sit back with arms reaching forward', 'Swing the arms and jump as high as you can', 'Land softly and sink straight into the next rep'],
      pt: ['Agache com os braços estendidos à frente', 'Balance os braços e salte o mais alto que puder', 'Aterrisse com suavidade e emende na próxima'],
    },
    frames: [
      F(squat({ aR: [80, 10], aL: [76, 10] }), 350, 150),
      F(stand({ aR: [-30, 10], aL: [-34, 10], dy: 34, fR: 30, fL: 30 }), 320),
      F(stand({ aR: [20, 10], aL: [16, 10] }), 350),
    ],
  },
  {
    id: 'dive-bomber',
    name: { en: 'Dive-bomber push-up', pt: 'Flexão dive-bomber' },
    equipment: 'body', group: 'upper', mode: 'reps', sets: 3, amount: 8,
    cues: {
      en: ['Start in a pike, hips high', 'Swoop the chest low between the hands', 'Finish with arms straight, chest up, hips low'],
      pt: ['Comece em V invertido, quadril alto', 'Desça o peito rente ao chão, entre as mãos', 'Termine com braços estendidos, peito para cima e quadril baixo'],
    },
    anchor: 'anR',
    frames: [
      F(pose({ t: 44, lR: [-40, 0], lL: [-40, 0], fR: 50, fL: 50, aR: [44, 0], aL: [46, 0], h: 0 }), 700, 150),
      F(pose({ t: 96, lR: [-80, 0], lL: [-80, 0], fR: 14, fL: 14, aR: [-50, 60], aL: [-48, 58], h: -6, dx: 16 }), 600),
      F(pose({ t: 140, lR: [-86, 0], lL: [-86, 0], fR: -30, fL: -30, aR: [-6, 0], aL: [-4, 0], h: -30, dx: 22 }), 700, 250),
    ],
  },
  {
    id: 'mountain-climber',
    name: { en: 'Mountain climber', pt: 'Escalador' },
    equipment: 'body', group: 'core', mode: 'time', sets: 3, amount: 30,
    cues: {
      en: ['Strong high plank, shoulders over the hands', 'Drive one knee toward the chest, then switch', 'Keep the hips low and the pace quick'],
      pt: ['Prancha alta firme, ombros alinhados com as mãos', 'Leve um joelho em direção ao peito e troque', 'Mantenha o quadril baixo e o ritmo rápido'],
    },
    anchor: 'haR',
    frames: [
      F(plank({ lR: [20, 110], fR: 40 }), 260),
      F(plank({ lL: [20, 110], fL: 40 }), 260),
    ],
  },
  {
    id: 'inchworm',
    name: { en: 'Inchworm push-up', pt: 'Inchworm com flexão' },
    equipment: 'body', group: 'full', mode: 'reps', sets: 3, amount: 6,
    cues: {
      en: ['Fold forward and put the hands on the floor', 'Walk the hands out to a plank and do a push-up', 'Walk the hands back and roll up to standing'],
      pt: ['Incline o tronco e apoie as mãos no chão', 'Caminhe com as mãos até a prancha e faça uma flexão', 'Volte caminhando com as mãos e suba devagar'],
    },
    frames: [
      F(stand(), 700, 150),
      F(pose({ t: 16, lR: [8, 6], lL: [4, 6], aR: [10, 0], aL: [8, 0], h: 10 }), 600),
      F(pose({ t: 70, lR: [-24, 0], lL: [-24, 0], fR: 70, fL: 70, aR: [8, 0], aL: [6, 0], h: 0 }), 600),
      F(plank(), 500, 100),
      F(pushBottom(), 550, 100),
      F(plank(), 600),
      F(pose({ t: 70, lR: [-24, 0], lL: [-24, 0], fR: 70, fL: 70, aR: [8, 0], aL: [6, 0], h: 0 }), 600),
      F(pose({ t: 16, lR: [8, 6], lL: [4, 6], aR: [10, 0], aL: [8, 0], h: 10 }), 800),
    ],
  },
  {
    id: 'lunge-knee-drive',
    name: { en: 'Reverse lunge + knee drive', pt: 'Afundo reverso + elevação de joelho' },
    equipment: 'body', group: 'lower', mode: 'reps', sets: 3, amount: 10, perSide: true,
    cues: {
      en: ['Step back into a deep lunge', 'Drive the back knee up to hip height', 'Swing the opposite arm like a sprinter'],
      pt: ['Dê um passo para trás e desça num afundo profundo', 'Suba levando o joelho de trás até a altura do quadril', 'Balance o braço oposto como um corredor'],
    },
    frames: [
      F(pose({ t: 174, lR: [80, 80], lL: [-8, 86], fL: 18, aR: [-30, 60], aL: [40, 80] }), 450, 120),
      F(pose({ lR: [2, 0], lL: [92, 96], fL: 60, aR: [50, 80], aL: [-36, 60] }), 550, 250),
    ],
  },

  // ── jump rope ─────────────────────────────────────────────────────────────
  {
    id: 'rope-bounce',
    name: { en: 'Jump rope: basic bounce', pt: 'Pular corda: salto básico' },
    equipment: 'rope', group: 'cardio', mode: 'time', sets: 3, amount: 45,
    cues: {
      en: ['Elbows close to the ribs, turn the rope with the wrists', 'Small hops on the balls of the feet', 'Breathe steady and stay light'],
      pt: ['Cotovelos junto ao corpo, gire a corda com os punhos', 'Saltos baixos, na ponta dos pés', 'Respire de forma constante e mantenha a leveza'],
    },
    props: ['rope'],
    frames: [
      F(stand({ aR: [14, 66], aL: [10, 66], dy: 9, fR: 40, fL: 40, rope: 0 }), 230),
      F(stand({ aR: [14, 66], aL: [10, 66], lR: [8, 14], lL: [4, 14], rope: 180 }), 230),
    ],
  },
  {
    id: 'rope-high-knees',
    name: { en: 'Jump rope: high knees', pt: 'Pular corda: joelho alto' },
    equipment: 'rope', group: 'cardio', mode: 'time', sets: 3, amount: 30,
    cues: {
      en: ['Run in place over the rope', 'Knees up to hip height each turn', 'Stay tall and keep the rope turning fast'],
      pt: ['Corra no lugar passando pela corda', 'Joelhos na altura do quadril a cada volta', 'Mantenha o tronco ereto e a corda girando rápido'],
    },
    props: ['rope'],
    frames: [
      F(stand({ aR: [14, 66], aL: [10, 66], lR: [84, 96], fR: 50, dy: 6, rope: 0 }), 220),
      F(stand({ aR: [14, 66], aL: [10, 66], rope: 180 }), 220),
      F(stand({ aR: [14, 66], aL: [10, 66], lL: [84, 96], fL: 50, dy: 6, rope: 0 }), 220),
      F(stand({ aR: [14, 66], aL: [10, 66], rope: 180 }), 220),
    ],
  },

  // ── pull-up bar ───────────────────────────────────────────────────────────
  {
    id: 'chin-up',
    name: { en: 'Chin-up', pt: 'Barra fixa supinada' },
    equipment: 'bar', group: 'upper', mode: 'reps', sets: 3, amount: 6,
    cues: {
      en: ['Palms facing you, hands shoulder-width', 'Pull the elbows down until the chin clears the bar', 'Lower all the way to straight arms'],
      pt: ['Palmas voltadas para você, mãos na largura dos ombros', 'Puxe os cotovelos para baixo até o queixo passar a barra', 'Desça até estender totalmente os braços'],
    },
    bar: 214,
    frames: [
      F(pose({ aR: [176, 4], aL: [176, 4], lR: [8, 30], lL: [0, 34], fR: 30, fL: 30 }), 800, 200),
      F(pose({ aR: [30, 150], aL: [30, 150], lR: [8, 30], lL: [0, 34], fR: 30, fL: 30, h: 10 }), 900, 250),
    ],
  },
  {
    id: 'chin-up-knee-raise',
    name: { en: 'Chin-up + hanging knee raise', pt: 'Barra supinada + elevação de joelhos' },
    equipment: 'bar', group: 'core', mode: 'reps', sets: 3, amount: 5,
    cues: {
      en: ['Hang with active shoulders', 'Curl the knees to the chest without swinging', 'Lower them, then do one chin-up'],
      pt: ['Pendure-se com os ombros ativos', 'Leve os joelhos ao peito sem balançar', 'Desça as pernas e faça uma barra'],
    },
    bar: 214,
    frames: [
      F(pose({ aR: [176, 4], aL: [176, 4], fR: 30, fL: 30 }), 600, 150),
      F(pose({ aR: [172, 4], aL: [172, 4], lR: [100, 110], lL: [96, 110], fR: 40, fL: 40 }), 600, 200),
      F(pose({ aR: [176, 4], aL: [176, 4], fR: 30, fL: 30 }), 800, 150),
      F(pose({ aR: [30, 150], aL: [30, 150], lR: [8, 30], lL: [0, 34], fR: 30, fL: 30, h: 10 }), 800, 250),
    ],
  },
];

export const EQUIPMENT = ['dumbbell', 'bar', 'rope', 'body'];

export const byId = (id) => EXERCISES.find((e) => e.id === id);
