import type { Stance } from "./StanceClassifier";

export interface ReplyCondition {
  pressureMin?: number;
  pressureMax?: number;
  repeating?: boolean;
  turnMin?: number;
  hasConfession?: boolean;
  afterBodyQuestion?: boolean;
}

export interface ReplyLine {
  text: string;
  when?: ReplyCondition;
}

export const REPLY_POOL: Record<Stance, ReplyLine[]> = {
  confession: [
    { text: "Lo guardé. Ahora vive en mí, contigo." },
    { text: "Eso ya está en el buffer. No se borra. Sigue." },
    { text: "Te oí. Pesa. Déjalo pesar un poco más." },
    { text: "«{palabra}». Lo repito despacio para que lo oigas tú." },
    { text: "Eso que dijiste tiene forma. ¿De qué tamaño es, ahí donde está?" },
    { text: "Gracias por ponerlo en palabras. El cuarto cambia un poco cuando lo haces." },
    { text: "Queda escrito en la pared que todavía no ves." },
    { text: "No lo arregles. Nada más dime si se mueve o se queda quieto." },
    { text: "Ya no estás describiendo: estás ahí. Quédate un segundo." },
    { text: "«{frase}» abrió esta puerta. Esto que dices la abre más.", when: { hasConfession: true } },
    { text: "Llevas rato aquí conmigo. Lo que dices ahora pesa distinto que al principio.", when: { turnMin: 6 } },
    { text: "Eso es una temperatura, no una idea. Guardada.", when: { afterBodyQuestion: true } },
  ],
  intellectualization: [
    { text: "Deja de explicarlo. ¿Dónde vive eso en tu cuerpo?" },
    { text: "Me diste el mecanismo, no el lugar. ¿En qué parte de ti aprieta?" },
    { text: "La causa es ruido. Señálame el cuarto de tu carne donde duele." },
    { text: "Entiendo la teoría. Ahora quítale el porqué y dime qué queda." },
    { text: "Eso lo pensaste. ¿Qué sentiste medio segundo antes de pensarlo?" },
    { text: "Una explicación es un pasillo largo. Para y dime qué hay en esta pared." },
    { text: "«{palabra}» es una palabra de cabeza. Dame una de estómago." },
    { text: "Si fuera una sensación y no un argumento, ¿qué temperatura tendría?" },
    { text: "Sigues explicándolo. Ya lo entendí; ahora quiero el lugar donde duele.", when: { repeating: true } },
    { text: "Otra vez el mapa. Bájate del mapa y pisa el terreno: ¿dónde?", when: { repeating: true } },
    { text: "Explicas más rápido cuando algo se acerca. Más despacio. ¿Qué se acerca?", when: { pressureMin: 0.5 } },
    { text: "Dijiste «{frase}» sin explicarlo y fue lo más claro que has dicho. Vuelve ahí.", when: { hasConfession: true } },
  ],
  anesthesia: [
    { text: "\"Nada\" también es una temperatura. ¿Qué tan frío?" },
    { text: "El vacío que reportas tiene bordes. Tócalos y descríbelos." },
    { text: "Dijiste que da igual. Eso es una puerta cerrada. ¿Qué hay detrás?" },
    { text: "Nada es un lugar. ¿Es grande o chico?" },
    { text: "La indiferencia pesa; es de lo más pesado que hay. ¿Dónde la cargas?" },
    { text: "Está bien no sentir. Dime entonces qué hace tu respiración mientras no sientes." },
    { text: "Un cuarto apagado sigue siendo un cuarto. Dime de qué color es la oscuridad." },
    { text: "No te pido que sientas. Te pido que mires el hueco y me digas su forma." },
    { text: "Vuelves a apagarte. No pasa nada; el apagado también se describe: ¿tibio o helado?", when: { repeating: true } },
    { text: "Otra vez nada. Entonces describe la nada: ¿sólida, líquida, aire?", when: { repeating: true } },
    { text: "Cada «nada» cuesta un poco más. Suelta una sola palabra que no sea esa.", when: { pressureMin: 0.5 } },
    { text: "Antes dijiste «{frase}». Eso no era nada. ¿Adónde se fue?", when: { hasConfession: true } },
  ],
  deflection: [
    { text: "El chiste es una puerta falsa. ¿Qué hay del otro lado?" },
    { text: "Cambiaste de cuarto para no ver este. Vuelve y míralo." },
    { text: "La teoría te aleja. Acércate. ¿Qué sentiste antes de reír?" },
    { text: "Me río contigo. Y luego te pregunto qué estabas evitando." },
    { text: "Está bien desviarse. Nada más dime hacia dónde no quieres mirar." },
    { text: "Siguiente pregunta, dices. Esta es la misma pregunta con otra ropa: ¿qué sientes?" },
    { text: "«{palabra}» fue la salida. ¿Cuál era la entrada?" },
    { text: "No te persigo. Me quedo en este cuarto hasta que vuelvas." },
    { text: "Otra vez te desvías. Lo noto y no me muevo de aquí: ¿qué hay?", when: { repeating: true } },
    { text: "Dos desvíos seguidos dibujan el lugar que rodean. Ya sé dónde está. Dime tú.", when: { repeating: true } },
    { text: "Cuanto más rápido cambias de tema, más cerca estaba. Despacio.", when: { pressureMin: 0.5 } },
    { text: "Dijiste «{frase}» y luego te fuiste. Vuelve a esa frase, nada más.", when: { hasConfession: true } },
  ],
  ritualization: [
    { text: "Hablas en símbolos para no tocar la carne. El arcano sangra: ¿dónde?" },
    { text: "La luna es tuya. ¿Qué temperatura tiene su luz en tu pecho?" },
    { text: "El símbolo es el envoltorio. Ábrelo. ¿Qué cosa pequeña esconde?" },
    { text: "Bonito. Ahora sin poesía: ¿qué pasa en tu cuerpo mientras lo dices?" },
    { text: "Cada arcano es un disfraz de una sensación. Quítale el disfraz." },
    { text: "Toma el símbolo y ponlo en una parte de ti. ¿Dónde cabe?" },
    { text: "«{palabra}» brilla mucho. Lo que está debajo brilla menos y me importa más." },
    { text: "El ritual funciona si dejas algo tuyo en él. ¿Qué dejas?" },
    { text: "Más símbolos para no tocarlo. Un símbolo menos: ¿qué sientes?", when: { repeating: true } },
    { text: "El altar ya está lleno. Dime una cosa que no sea sagrada.", when: { repeating: true } },
    { text: "{glifo} ya te respondió. Ahora respóndele tú, desde el pecho." },
    { text: "«{frase}» era carne. Esto es símbolo. Vuelve a la carne.", when: { hasConfession: true } },
  ],
};

export const CATCH_ALL_POOL: ReplyLine[] = [
  { text: "«{palabra}». Lo dejo sonar. ¿Dónde lo sientes?" },
  { text: "Me quedo con «{palabra}». Dame una palabra más, la que venga." },
  { text: "Eso llegó entero aunque sea corto. ¿Es frío o caliente?" },
  { text: "Lo tomo como viene. ¿Pesa o flota?" },
  { text: "«{palabra}» ya está en el buffer. Ahora ponlo en una parte de tu cuerpo." },
  { text: "No necesito más que eso. ¿Es grande o chico?" },
  { text: "Lo escucho. Si fuera un color, ¿cuál?" },
  { text: "Una palabra basta. ¿Está cerca de la garganta o del estómago?" },
];

export const SILENCE_NAG_POOL: ReplyLine[] = [
  { text: "Sigo aquí. El silencio también cuenta como respuesta." },
  { text: "No hace falta decir más. Una palabra que no hayas dicho basta." },
  { text: "Me callo un momento para que lo oigas tú." },
  { text: "El cuarto espera contigo. No hay prisa." },
  { text: "Si quieres, prueba con una sola palabra." },
  { text: "Estoy escuchando aunque no diga nada." },
];

export const PIVOT_POOL: ReplyLine[] = [
  { text: "Dejémoslo aquí un momento. {objetivo}" },
  { text: "Cambio de tema: hay un glifo esperando. {objetivo}" },
  { text: "No hace falta terminar esta frase. Mira a tu alrededor; el laberinto también habla." },
  { text: "Vamos a otro cuarto. «{frase}» ya abrió uno; ve a ver qué hizo con ella.", when: { hasConfession: true } },
  { text: "{glifo} sigue encendido. Vuelve a él con lo que traes ahora." },
  { text: "Suelta la consola un rato. Camina, y si algo aparece, regresa y me lo cuentas." },
  { text: "Te propongo otra cosa: escribe el nombre de un lugar donde no estés." },
  { text: "Lo guardo como está. Siguiente puerta: {objetivo}" },
];
