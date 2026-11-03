// PROTOTYPE ONLY: the directions behind the picker, in picker order.
import { console as consoleSkin } from "./console";
import { current } from "./current";
import { natif } from "./natif";
import { papier } from "./papier";
import type { Skin } from "./types";

export const SKINS: readonly Skin[] = [current, natif, consoleSkin, papier];
