/* eslint-disable */
import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} ArrowsInputs */
/** @typedef {{}} Askmainmenu2Inputs */
/** @typedef {{}} Askmainmenubody3Inputs */
/** @typedef {{}} Askmainmenuyes3Inputs */
/** @typedef {{}} AutosaveInputs */
/** @typedef {{}} BackInputs */
/** @typedef {{}} _ContinueInputs */
/** @typedef {{}} ContrastInputs */
/** @typedef {{}} Contrastmore1Inputs */
/** @typedef {{}} Contrastmost1Inputs */
/** @typedef {{}} Contrastnormal1Inputs */
/** @typedef {{}} ControlsInputs */
/** @typedef {{}} CreditsInputs */
/** @typedef {{}} EffectsInputs */
/** @typedef {{}} EmptyInputs */
/** @typedef {{}} Framecounter1Inputs */
/** @typedef {{}} LanguageInputs */
/** @typedef {{}} LessInputs */
/** @typedef {{}} LoseInputs */
/** @typedef {{}} Mainmenu1Inputs */
/** @typedef {{}} MasterInputs */
/** @typedef {{}} MoreInputs */
/** @typedef {{}} MotionInputs */
/** @typedef {{}} Motionless1Inputs */
/** @typedef {{}} Motionnone1Inputs */
/** @typedef {{}} Motionnormal1Inputs */
/** @typedef {{}} MusicInputs */
/** @typedef {{}} MuteInputs */
/** @typedef {{}} Newgame1Inputs */
/** @typedef {{}} OffInputs */
/** @typedef {{}} OnInputs */
/** @typedef {{}} OopsInputs */
/** @typedef {{}} Oopsbody1Inputs */
/** @typedef {{}} PausedInputs */
/** @typedef {{}} Playagain1Inputs */
/** @typedef {{}} ResumeInputs */
/** @typedef {{}} SavesInputs */
/** @typedef {{}} SettingsInputs */
/** @typedef {{}} SkipInputs */
/** @typedef {{ number: NonNullable<unknown> }} SlotInputs */
/** @typedef {{}} SoundInputs */
/** @typedef {{}} StayInputs */
/** @typedef {{}} Textbig1Inputs */
/** @typedef {{}} Textbigger1Inputs */
/** @typedef {{}} Textbiggest1Inputs */
/** @typedef {{}} Textnormal1Inputs */
/** @typedef {{}} Textsize1Inputs */
/** @typedef {{}} Tryagain1Inputs */
/** @typedef {{}} WinInputs */
/** @typedef {{}} YesInputs */
import * as __en from "./en.js"
import * as __es from "./es.js"
/**
* | output |
* | --- |
* | "Arrows" |
*
* @param {ArrowsInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const arrows = /** @type {((inputs?: ArrowsInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<ArrowsInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.arrows(inputs)
	return __en.arrows(inputs)
});
/**
* | output |
* | --- |
* | "Go to the main menu?" |
*
* @param {Askmainmenu2Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const askmainmenu2 = /** @type {((inputs?: Askmainmenu2Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Askmainmenu2Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.askmainmenu2(inputs)
	return __en.askmainmenu2(inputs)
});
export { askmainmenu2 as "askMainMenu" }
/**
* | output |
* | --- |
* | "You will lose what you did since your last save." |
*
* @param {Askmainmenubody3Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const askmainmenubody3 = /** @type {((inputs?: Askmainmenubody3Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Askmainmenubody3Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.askmainmenubody3(inputs)
	return __en.askmainmenubody3(inputs)
});
export { askmainmenubody3 as "askMainMenuBody" }
/**
* | output |
* | --- |
* | "Go to main menu" |
*
* @param {Askmainmenuyes3Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const askmainmenuyes3 = /** @type {((inputs?: Askmainmenuyes3Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Askmainmenuyes3Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.askmainmenuyes3(inputs)
	return __en.askmainmenuyes3(inputs)
});
export { askmainmenuyes3 as "askMainMenuYes" }
/**
* | output |
* | --- |
* | "Autosave" |
*
* @param {AutosaveInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const autosave = /** @type {((inputs?: AutosaveInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<AutosaveInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.autosave(inputs)
	return __en.autosave(inputs)
});
/**
* | output |
* | --- |
* | "Back" |
*
* @param {BackInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const back = /** @type {((inputs?: BackInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<BackInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.back(inputs)
	return __en.back(inputs)
});
/**
* | output |
* | --- |
* | "Continue" |
*
* @param {_ContinueInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const _continue = /** @type {((inputs?: _ContinueInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<_ContinueInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es._continue(inputs)
	return __en._continue(inputs)
});
export { _continue as "continue" }
/**
* | output |
* | --- |
* | "More contrast" |
*
* @param {ContrastInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const contrast = /** @type {((inputs?: ContrastInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<ContrastInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.contrast(inputs)
	return __en.contrast(inputs)
});
/**
* | output |
* | --- |
* | "More" |
*
* @param {Contrastmore1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const contrastmore1 = /** @type {((inputs?: Contrastmore1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Contrastmore1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.contrastmore1(inputs)
	return __en.contrastmore1(inputs)
});
export { contrastmore1 as "contrastMore" }
/**
* | output |
* | --- |
* | "Most" |
*
* @param {Contrastmost1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const contrastmost1 = /** @type {((inputs?: Contrastmost1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Contrastmost1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.contrastmost1(inputs)
	return __en.contrastmost1(inputs)
});
export { contrastmost1 as "contrastMost" }
/**
* | output |
* | --- |
* | "Normal" |
*
* @param {Contrastnormal1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const contrastnormal1 = /** @type {((inputs?: Contrastnormal1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Contrastnormal1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.contrastnormal1(inputs)
	return __en.contrastnormal1(inputs)
});
export { contrastnormal1 as "contrastNormal" }
/**
* | output |
* | --- |
* | "Controls" |
*
* @param {ControlsInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const controls = /** @type {((inputs?: ControlsInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<ControlsInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.controls(inputs)
	return __en.controls(inputs)
});
/**
* | output |
* | --- |
* | "Credits" |
*
* @param {CreditsInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const credits = /** @type {((inputs?: CreditsInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<CreditsInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.credits(inputs)
	return __en.credits(inputs)
});
/**
* | output |
* | --- |
* | "Effects" |
*
* @param {EffectsInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const effects = /** @type {((inputs?: EffectsInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<EffectsInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.effects(inputs)
	return __en.effects(inputs)
});
/**
* | output |
* | --- |
* | "Empty" |
*
* @param {EmptyInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const empty = /** @type {((inputs?: EmptyInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<EmptyInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.empty(inputs)
	return __en.empty(inputs)
});
/**
* | output |
* | --- |
* | "Show frame count" |
*
* @param {Framecounter1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const framecounter1 = /** @type {((inputs?: Framecounter1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Framecounter1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.framecounter1(inputs)
	return __en.framecounter1(inputs)
});
export { framecounter1 as "frameCounter" }
/**
* | output |
* | --- |
* | "Language" |
*
* @param {LanguageInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const language = /** @type {((inputs?: LanguageInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<LanguageInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.language(inputs)
	return __en.language(inputs)
});
/**
* | output |
* | --- |
* | "Less" |
*
* @param {LessInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const less = /** @type {((inputs?: LessInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<LessInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.less(inputs)
	return __en.less(inputs)
});
/**
* | output |
* | --- |
* | "Out of time" |
*
* @param {LoseInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const lose = /** @type {((inputs?: LoseInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<LoseInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.lose(inputs)
	return __en.lose(inputs)
});
/**
* | output |
* | --- |
* | "Main menu" |
*
* @param {Mainmenu1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const mainmenu1 = /** @type {((inputs?: Mainmenu1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Mainmenu1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.mainmenu1(inputs)
	return __en.mainmenu1(inputs)
});
export { mainmenu1 as "mainMenu" }
/**
* | output |
* | --- |
* | "Everything" |
*
* @param {MasterInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const master = /** @type {((inputs?: MasterInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<MasterInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.master(inputs)
	return __en.master(inputs)
});
/**
* | output |
* | --- |
* | "More" |
*
* @param {MoreInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const more = /** @type {((inputs?: MoreInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<MoreInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.more(inputs)
	return __en.more(inputs)
});
/**
* | output |
* | --- |
* | "Less motion" |
*
* @param {MotionInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const motion = /** @type {((inputs?: MotionInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<MotionInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.motion(inputs)
	return __en.motion(inputs)
});
/**
* | output |
* | --- |
* | "Less" |
*
* @param {Motionless1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const motionless1 = /** @type {((inputs?: Motionless1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Motionless1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.motionless1(inputs)
	return __en.motionless1(inputs)
});
export { motionless1 as "motionLess" }
/**
* | output |
* | --- |
* | "None" |
*
* @param {Motionnone1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const motionnone1 = /** @type {((inputs?: Motionnone1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Motionnone1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.motionnone1(inputs)
	return __en.motionnone1(inputs)
});
export { motionnone1 as "motionNone" }
/**
* | output |
* | --- |
* | "Normal" |
*
* @param {Motionnormal1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const motionnormal1 = /** @type {((inputs?: Motionnormal1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Motionnormal1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.motionnormal1(inputs)
	return __en.motionnormal1(inputs)
});
export { motionnormal1 as "motionNormal" }
/**
* | output |
* | --- |
* | "Music" |
*
* @param {MusicInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const music = /** @type {((inputs?: MusicInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<MusicInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.music(inputs)
	return __en.music(inputs)
});
/**
* | output |
* | --- |
* | "Mute all sound" |
*
* @param {MuteInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const mute = /** @type {((inputs?: MuteInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<MuteInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.mute(inputs)
	return __en.mute(inputs)
});
/**
* | output |
* | --- |
* | "New game" |
*
* @param {Newgame1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const newgame1 = /** @type {((inputs?: Newgame1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Newgame1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.newgame1(inputs)
	return __en.newgame1(inputs)
});
export { newgame1 as "newGame" }
/**
* | output |
* | --- |
* | "Off" |
*
* @param {OffInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const off = /** @type {((inputs?: OffInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<OffInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.off(inputs)
	return __en.off(inputs)
});
/**
* | output |
* | --- |
* | "On" |
*
* @param {OnInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const on = /** @type {((inputs?: OnInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<OnInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.on(inputs)
	return __en.on(inputs)
});
/**
* | output |
* | --- |
* | "Something went wrong" |
*
* @param {OopsInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const oops = /** @type {((inputs?: OopsInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<OopsInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.oops(inputs)
	return __en.oops(inputs)
});
/**
* | output |
* | --- |
* | "The game hit a problem. Your saves are safe." |
*
* @param {Oopsbody1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const oopsbody1 = /** @type {((inputs?: Oopsbody1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oopsbody1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.oopsbody1(inputs)
	return __en.oopsbody1(inputs)
});
export { oopsbody1 as "oopsBody" }
/**
* | output |
* | --- |
* | "Paused" |
*
* @param {PausedInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const paused = /** @type {((inputs?: PausedInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<PausedInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.paused(inputs)
	return __en.paused(inputs)
});
/**
* | output |
* | --- |
* | "Play again" |
*
* @param {Playagain1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const playagain1 = /** @type {((inputs?: Playagain1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Playagain1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.playagain1(inputs)
	return __en.playagain1(inputs)
});
export { playagain1 as "playAgain" }
/**
* | output |
* | --- |
* | "Resume" |
*
* @param {ResumeInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const resume = /** @type {((inputs?: ResumeInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<ResumeInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.resume(inputs)
	return __en.resume(inputs)
});
/**
* | output |
* | --- |
* | "Your saves" |
*
* @param {SavesInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const saves = /** @type {((inputs?: SavesInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<SavesInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.saves(inputs)
	return __en.saves(inputs)
});
/**
* | output |
* | --- |
* | "Settings" |
*
* @param {SettingsInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const settings = /** @type {((inputs?: SettingsInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<SettingsInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.settings(inputs)
	return __en.settings(inputs)
});
/**
* | output |
* | --- |
* | "Tap to skip" |
*
* @param {SkipInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const skip = /** @type {((inputs?: SkipInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<SkipInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.skip(inputs)
	return __en.skip(inputs)
});
/**
* | output |
* | --- |
* | "Save {number}" |
*
* @param {SlotInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const slot = /** @type {((inputs: SlotInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<SlotInputs, { locale?: "en" | "es" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.slot(inputs)
	return __en.slot(inputs)
});
/**
* | output |
* | --- |
* | "Sound" |
*
* @param {SoundInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const sound = /** @type {((inputs?: SoundInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<SoundInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.sound(inputs)
	return __en.sound(inputs)
});
/**
* | output |
* | --- |
* | "Stay here" |
*
* @param {StayInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const stay = /** @type {((inputs?: StayInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<StayInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.stay(inputs)
	return __en.stay(inputs)
});
/**
* | output |
* | --- |
* | "Big" |
*
* @param {Textbig1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const textbig1 = /** @type {((inputs?: Textbig1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Textbig1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.textbig1(inputs)
	return __en.textbig1(inputs)
});
export { textbig1 as "textBig" }
/**
* | output |
* | --- |
* | "Bigger" |
*
* @param {Textbigger1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const textbigger1 = /** @type {((inputs?: Textbigger1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Textbigger1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.textbigger1(inputs)
	return __en.textbigger1(inputs)
});
export { textbigger1 as "textBigger" }
/**
* | output |
* | --- |
* | "Biggest" |
*
* @param {Textbiggest1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const textbiggest1 = /** @type {((inputs?: Textbiggest1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Textbiggest1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.textbiggest1(inputs)
	return __en.textbiggest1(inputs)
});
export { textbiggest1 as "textBiggest" }
/**
* | output |
* | --- |
* | "Normal" |
*
* @param {Textnormal1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const textnormal1 = /** @type {((inputs?: Textnormal1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Textnormal1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.textnormal1(inputs)
	return __en.textnormal1(inputs)
});
export { textnormal1 as "textNormal" }
/**
* | output |
* | --- |
* | "Bigger text" |
*
* @param {Textsize1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const textsize1 = /** @type {((inputs?: Textsize1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Textsize1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.textsize1(inputs)
	return __en.textsize1(inputs)
});
export { textsize1 as "textSize" }
/**
* | output |
* | --- |
* | "Try again" |
*
* @param {Tryagain1Inputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
const tryagain1 = /** @type {((inputs?: Tryagain1Inputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tryagain1Inputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.tryagain1(inputs)
	return __en.tryagain1(inputs)
});
export { tryagain1 as "tryAgain" }
/**
* | output |
* | --- |
* | "You did it!" |
*
* @param {WinInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const win = /** @type {((inputs?: WinInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<WinInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.win(inputs)
	return __en.win(inputs)
});
/**
* | output |
* | --- |
* | "Yes" |
*
* @param {YesInputs} inputs
* @param {{ locale?: "en" | "es" }} options
* @returns {LocalizedString}
*/
export const yes = /** @type {((inputs?: YesInputs, options?: { locale?: "en" | "es" }) => LocalizedString) & import('../runtime.js').MessageMetadata<YesInputs, { locale?: "en" | "es" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "es") return __es.yes(inputs)
	return __en.yes(inputs)
});