export const OFFICE_HP_MAX = 3;
export const OFFICE_TIME_LIMIT = 90;
export const OFFICE_INVULNERABLE_SECONDS = 0.8;
export const OFFICE_WOK_HIT_RADIUS = 1.2;
export const OFFICE_BOSS_SPEED = 3.3;

// 难度爬升：所有数值从 START 连续插值到 END，在 RAMP_SECONDS 时达到满难度
export const OFFICE_RAMP_SECONDS = 70;

// 同一时刻并存的黑锅数：每5秒多1口，直到占满80%屏幕
export const OFFICE_WOK_INCREMENT_SECONDS = 5;
// 80%屏幕上限：游戏区 20x13=260，单锅影响区 π*1.2²≈4.52 → floor(208/4.52)≈46
const PLAY_AREA = 20 * 13;
const WOK_AREA = Math.PI * 1.2 * 1.2;
export const OFFICE_MAX_WOKS_CAP = Math.floor(0.8 * PLAY_AREA / WOK_AREA);

// 生成间隔现在由 spawnInterval() 动态计算：生命周期 / 目标并发数

// 红圈预警时长：始终留出反应时间
export const OFFICE_WOK_WARNING_START = 1.2;
export const OFFICE_WOK_WARNING_END = 0.7;

// 坠落时长：从高空落到地面
export const OFFICE_WOK_FALL_START = 1.2;
export const OFFICE_WOK_FALL_END = 0.85;

// 开局：前几秒只掉单口锅，新系统从1开始自然宽松

