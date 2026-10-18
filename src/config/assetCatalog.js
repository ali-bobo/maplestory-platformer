export const CHARACTER_ASSETS = [
  {
    assetId: 'CHR-PLY-001',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_idle',
    path: 'dist/assets/player_idle.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-002',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_walk_1',
    path: 'dist/assets/player_walk_1.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-003',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_walk_2',
    path: 'dist/assets/player_walk_2.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-004',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_jump',
    path: 'dist/assets/player_jump.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-005',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_attack',
    path: 'dist/assets/player_attack.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-006',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_hurt',
    path: 'dist/assets/player_hurt.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-007',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_portrait',
    path: 'dist/assets/player_portrait.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-008',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_slash_1',
    path: 'dist/assets/player_slash_1.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-009',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_slash_2',
    path: 'dist/assets/player_slash_2.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-010',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_slash_3',
    path: 'dist/assets/player_slash_3.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-011',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_walk_3',
    path: 'dist/assets/player_walk_3.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-012',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_walk_4',
    path: 'dist/assets/player_walk_4.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-013',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_fall',
    path: 'dist/assets/player_fall.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-014',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_throw_1',
    path: 'dist/assets/player_throw_1.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-015',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_throw_2',
    path: 'dist/assets/player_throw_2.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-016',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_die',
    path: 'dist/assets/player_die.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-017',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_down',
    path: 'dist/assets/player_down.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-018',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_dash',
    path: 'dist/assets/player_dash.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-019',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_cast',
    path: 'dist/assets/player_cast.png',
    status: 'used',
  },
  {
    assetId: 'CHR-PLY-020',
    groupId: 'CHR-PLY',
    kind: 'character',
    key: 'player_idle_2',
    path: 'dist/assets/player_idle_2.png',
    status: 'used',
  },
  {
    assetId: 'CHR-TTL-001',
    groupId: 'CHR-TTL',
    kind: 'character',
    key: 'title_hero',
    path: 'dist/assets/title_hero.png',
    status: 'used',
  },
  // 主選單標題徽章（星形 + 雙匕首 + 空白緞帶，遊戲名稱寫在緞帶上）
  {
    assetId: 'CHR-TTL-002',
    groupId: 'CHR-TTL',
    kind: 'ui',
    key: 'title_emblem',
    path: 'dist/assets/title_emblem.png',
    status: 'used',
  },
];

// 新手教學的劇情插畫（960×540）：只有教學場景要用，進場景時才載入
export const STORY_ASSETS = [1, 2, 3, 4].map((n) => ({
  assetId: `STY-00${n}`,
  groupId: 'STY',
  kind: 'story',
  key: `story_${n}`,
  path: `dist/assets/story_${n}.webp`,
  status: 'used',
  scope: 'lazy',
}));

export const BACKGROUND_ASSETS = [
  {
    assetId: 'BG-SKY-001',
    groupId: 'BG-SKY',
    kind: 'background',
    key: 'bg_sky',
    path: 'dist/assets/bg_sky.webp',
    status: 'used',
    targetMaps: ['sky'],
  },
  {
    assetId: 'BG-RUI-001',
    groupId: 'BG-RUI',
    kind: 'background',
    key: 'bg_ruins',
    path: 'dist/assets/bg_ruins.webp',
    status: 'used',
    targetMaps: ['ruins'],
  },
  {
    assetId: 'BG-CIT-001',
    groupId: 'BG-CIT',
    kind: 'background',
    key: 'bg_city',
    path: 'dist/assets/bg_city.webp',
    status: 'used',
    targetMaps: ['alley'],
  },
  {
    assetId: 'BG-FOR-001',
    groupId: 'BG-FOR',
    kind: 'background',
    key: 'bg_forest',
    path: 'dist/assets/bg_forest.webp',
    status: 'used',
    targetMaps: ['forest'],
  },
  {
    assetId: 'BG-TOY-001',
    groupId: 'BG-TOY',
    kind: 'background',
    key: 'bg_town',
    path: 'dist/assets/bg_town.webp',
    status: 'used',
    targetMaps: ['town'],
  },
  {
    assetId: 'BG-MYS-001',
    groupId: 'BG-MYS',
    kind: 'background',
    key: 'bg_mystic',
    path: 'dist/assets/bg_mystic.webp',
    status: 'used',
    targetMaps: ['mystic'],
  },
  {
    assetId: 'BG-TPE-001',
    groupId: 'BG-TPE',
    kind: 'background',
    key: 'bg_taipei',
    path: 'dist/assets/bg_taipei.webp',
    status: 'used',
    targetMaps: ['taipei'],
  },
  {
    assetId: 'BG-BOSS-001',
    groupId: 'BG-BOSS',
    kind: 'background',
    key: 'bg_boss_room',
    path: 'dist/assets/bg_boss_room.webp',
    status: 'used',
    targetMaps: ['boss'],
  },
  // 第 3 階段（狂暴）時淡入的 Boss 房背景
  {
    assetId: 'BG-BOSS-002',
    groupId: 'BG-BOSS',
    kind: 'background',
    key: 'bg_boss_room_rage',
    path: 'dist/assets/bg_boss_room_rage.webp',
    status: 'used',
    targetMaps: ['boss'],
  },
  {
    assetId: 'BG-SHR-001',
    groupId: 'BG-SHR',
    kind: 'background',
    key: 'bg_shrine',
    path: 'dist/assets/bg_shrine.webp',
    status: 'used',
    targetMaps: ['shrine'],
  },
  {
    assetId: 'BG-HBR-001',
    groupId: 'BG-HBR',
    kind: 'background',
    key: 'bg_harbor',
    path: 'dist/assets/bg_harbor.webp',
    status: 'used',
    targetMaps: ['harbor'],
  },
  {
    assetId: 'BG-DST-001', groupId: 'BG-DST', kind: 'background', key: 'bg_desert', path: 'dist/assets/bg_desert.webp', status: 'used', targetMaps: ['desert'],
  },
  {
    assetId: 'BG-SNW-001', groupId: 'BG-SNW', kind: 'background', key: 'bg_snow', path: 'dist/assets/bg_snow.webp', status: 'used', targetMaps: ['snow'],
  },
  {
    assetId: 'BG-LAV-001', groupId: 'BG-LAV', kind: 'background', key: 'bg_lava', path: 'dist/assets/bg_lava.webp', status: 'used', targetMaps: ['lava'],
  },
  {
    assetId: 'BG-CST-001', groupId: 'BG-CST', kind: 'background', key: 'bg_castle', path: 'dist/assets/bg_castle.webp', status: 'used', targetMaps: ['castle'],
  },
  {
    assetId: 'BG-DGN-001',
    groupId: 'BG-DGN',
    kind: 'background',
    key: 'bg_dungeon',
    path: 'dist/assets/bg_dungeon.webp',
    status: 'used',
    targetMaps: ['dungeon'],
  },
  {
    assetId: 'BG-TTL-001',
    groupId: 'BG-TTL',
    kind: 'background',
    key: 'title_bg',
    path: 'dist/assets/title_bg.webp',
    status: 'used',
    targetMaps: ['menu'],
  },
];

export const PLATFORM_ASSETS = [
  {
    assetId: 'PLT-SKY-001',
    groupId: 'PLT-SKY',
    kind: 'platform',
    key: 'platform_sky',
    path: 'dist/assets/platform_sky.png',
    status: 'used',
  },
  {
    assetId: 'PLT-FOR-001',
    groupId: 'PLT-FOR',
    kind: 'platform',
    key: 'platform_forest',
    path: 'dist/assets/platform_forest.png',
    status: 'used',
  },
  {
    assetId: 'PLT-RUI-001',
    groupId: 'PLT-RUI',
    kind: 'platform',
    key: 'platform_ruins',
    path: 'dist/assets/platform_ruins.png',
    status: 'used',
  },
  {
    assetId: 'PLT-MYS-001',
    groupId: 'PLT-MYS',
    kind: 'platform',
    key: 'platform_mystic',
    path: 'dist/assets/platform_mystic.png',
    status: 'used',
  },
  {
    assetId: 'PLT-CIT-001',
    groupId: 'PLT-CIT',
    kind: 'platform',
    key: 'platform_city',
    path: 'dist/assets/platform_city.png',
    status: 'used',
  },
  {
    assetId: 'PLT-TPE-001',
    groupId: 'PLT-TPE',
    kind: 'platform',
    key: 'platform_taipei',
    path: 'dist/assets/platform_taipei.png',
    status: 'used',
  },
  {
    assetId: 'PLT-TOW-001',
    groupId: 'PLT-TOW',
    kind: 'platform',
    key: 'platform_town',
    path: 'dist/assets/platform_town.png',
    status: 'used',
  },
  {
    assetId: 'PLT-HBR-001',
    groupId: 'PLT-HBR',
    kind: 'platform',
    key: 'platform_harbor',
    path: 'dist/assets/platform_harbor.png',
    status: 'used',
  },
  { assetId: 'PLT-DST-001', groupId: 'PLT-DST', kind: 'platform', key: 'platform_desert', path: 'dist/assets/platform_desert.png', status: 'used' },
  { assetId: 'PLT-SNW-001', groupId: 'PLT-SNW', kind: 'platform', key: 'platform_snow', path: 'dist/assets/platform_snow.png', status: 'used' },
  { assetId: 'PLT-LAV-001', groupId: 'PLT-LAV', kind: 'platform', key: 'platform_lava', path: 'dist/assets/platform_lava.png', status: 'used' },
  { assetId: 'PLT-CST-001', groupId: 'PLT-CST', kind: 'platform', key: 'platform_castle', path: 'dist/assets/platform_castle.png', status: 'used' },
  { assetId: 'PLT-SHR-001', groupId: 'PLT-SHR', kind: 'platform', key: 'platform_shrine', path: 'dist/assets/platform_shrine.png', status: 'used' },
  {
    assetId: 'PLT-BOS-001',
    groupId: 'PLT-BOS',
    kind: 'platform',
    key: 'platform_boss',
    path: 'dist/assets/platform_boss.png',
    status: 'used',
  },
  {
    assetId: 'PLT-DUN-001',
    groupId: 'PLT-DUN',
    kind: 'platform',
    key: 'platform_dungeon',
    path: 'dist/assets/platform_dungeon.png',
    status: 'used',
  },
];

export const MONSTER_ASSETS = [
  {
    assetId: 'MON-LEG-001',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_slime',
    path: 'dist/assets/monster_slime.png',
    status: 'used',
    monsterIds: ['slime', 'shadow-slime'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-002',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_mushroom',
    path: 'dist/assets/monster_mushroom.png',
    status: 'used',
    monsterIds: ['mushroom'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-003',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_snail',
    path: 'dist/assets/monster_snail.png',
    status: 'used',
    monsterIds: ['snail'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-004',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_stump',
    path: 'dist/assets/monster_stump.png',
    status: 'used',
    monsterIds: ['stump'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-005',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_boar',
    path: 'dist/assets/monster_boar.png',
    status: 'used',
    monsterIds: ['boar'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-006',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_robot',
    path: 'dist/assets/monster_robot.png',
    status: 'used',
    monsterIds: ['robot'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-007',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_skeleton',
    path: 'dist/assets/monster_skeleton.png',
    status: 'used',
    monsterIds: ['skeleton'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-008',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_snake',
    path: 'dist/assets/monster_snake.png',
    status: 'used',
    monsterIds: ['snake'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-009',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_dragon',
    path: 'dist/assets/monster_dragon.png',
    status: 'used',
    monsterIds: ['dragon'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-010',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_cyclops',
    path: 'dist/assets/monster_cyclops.png',
    status: 'used',
    monsterIds: ['cyclops'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-011',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_golem',
    path: 'dist/assets/monster_golem.png',
    status: 'used',
    monsterIds: ['golem'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-LEG-012',
    groupId: 'MON-LEG',
    kind: 'monster',
    key: 'monster_mimic',
    path: 'dist/assets/monster_mimic.png',
    status: 'used',
    monsterIds: ['mimic'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-NEW-001',
    groupId: 'MON-NEW',
    kind: 'monster',
    key: 'monster_new_0',
    path: 'dist/assets/monster_new_0.png',
    status: 'used',
    monsterIds: ['sky_imp'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-NEW-002',
    groupId: 'MON-NEW',
    kind: 'monster',
    key: 'monster_new_1',
    path: 'dist/assets/monster_new_1.png',
    status: 'used',
    monsterIds: ['sky_bird'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-NEW-003',
    groupId: 'MON-NEW',
    kind: 'monster',
    key: 'monster_new_2',
    path: 'dist/assets/monster_new_2.png',
    status: 'used',
    monsterIds: ['sky_puff'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-NEW-004',
    groupId: 'MON-NEW',
    kind: 'monster',
    key: 'monster_new_3',
    path: 'dist/assets/monster_new_3.png',
    status: 'used',
    monsterIds: ['ruin_knight'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-NEW-005',
    groupId: 'MON-NEW',
    kind: 'monster',
    key: 'monster_new_4',
    path: 'dist/assets/monster_new_4.png',
    status: 'used',
    monsterIds: ['ruin_golem'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-NEW-006',
    groupId: 'MON-NEW',
    kind: 'monster',
    key: 'monster_new_5',
    path: 'dist/assets/monster_new_5.png',
    status: 'used',
    monsterIds: ['ruin_wraith'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-NEW-007',
    groupId: 'MON-NEW',
    kind: 'monster',
    key: 'monster_new_6',
    path: 'dist/assets/monster_new_6.png',
    status: 'used',
    monsterIds: ['city_thug'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-BIG-001',
    groupId: 'MON-BIG',
    kind: 'monster',
    key: 'monster_big_0',
    path: 'dist/assets/monster_big_0.png',
    status: 'used',
    monsterIds: ['ruin_beast'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-BIG-002',
    groupId: 'MON-BIG',
    kind: 'monster',
    key: 'monster_big_1',
    path: 'dist/assets/monster_big_1.png',
    status: 'used',
    monsterIds: ['ruin_giant'],
    alignmentStatus: 'complete',
  },
  {
    assetId: 'MON-BIG-003',
    groupId: 'MON-BIG',
    kind: 'monster',
    key: 'monster_big_2',
    path: 'dist/assets/monster_big_2.png',
    status: 'unused',
    monsterIds: [],
    alignmentStatus: 'complete',
    sourceSheet: '遊戲畫面/monster3.jpg',
    sourceFamily: 'machine',
  },
  {
    assetId: 'MON-BIG-004',
    groupId: 'MON-BIG',
    kind: 'monster',
    key: 'monster_big_3',
    path: 'dist/assets/monster_big_3.png',
    status: 'used',
    monsterIds: ['city_beast'],
    alignmentStatus: 'complete',
    sourceSheet: '遊戲畫面/monster3.jpg',
    sourceFamily: 'city-beast',
  },
  {
    assetId: 'MON-BIG-005',
    groupId: 'MON-BIG',
    kind: 'monster',
    key: 'monster_big_4',
    path: 'dist/assets/monster_big_4.png',
    status: 'unused',
    monsterIds: [],
    alignmentStatus: 'complete',
    sourceSheet: '遊戲畫面/monster3.jpg',
    sourceFamily: 'elite',
  },
  {
    assetId: 'MON-MB-001',
    groupId: 'MON-MB',
    kind: 'miniboss',
    key: 'miniboss_0',
    path: 'dist/assets/miniboss_0.png',
    status: 'unused',
    monsterIds: [],
    alignmentStatus: 'complete',
    sourceSheet: '遊戲畫面/monster3.jpg',
    sourceFamily: 'miniboss',
  },
  {
    assetId: 'MON-MB-002',
    groupId: 'MON-MB',
    kind: 'miniboss',
    key: 'miniboss_1',
    path: 'dist/assets/miniboss_1.png',
    status: 'used',
    monsterIds: ['city_boss2'],
    alignmentStatus: 'complete',
    sourceSheet: '遊戲畫面/monster3.jpg',
    sourceFamily: 'miniboss',
  },
  // 台北街頭怪：由 art-source/characters 的兩張原始總表裁切（夜市扒手 / 龐克），
  // 混混與扒手頭目是現有圖的換色版
  { assetId: 'MON-CITY-001', groupId: 'MON-CITY', kind: 'monster', key: 'monster_punk', path: 'dist/assets/monster_punk.png', status: 'used', monsterIds: ['city_mech'], alignmentStatus: 'complete' },
  { assetId: 'MON-CITY-002', groupId: 'MON-CITY', kind: 'monster', key: 'monster_punk_red', path: 'dist/assets/monster_punk_red.png', status: 'used', monsterIds: ['street_punk'], alignmentStatus: 'complete' },
  { assetId: 'MON-CITY-003', groupId: 'MON-CITY', kind: 'monster', key: 'monster_pickpocket', path: 'dist/assets/monster_pickpocket.png', status: 'used', monsterIds: ['city_elite'], alignmentStatus: 'complete' },
  { assetId: 'MON-CITY-004', groupId: 'MON-CITY', kind: 'miniboss', key: 'miniboss_street', path: 'dist/assets/miniboss_street.png', status: 'used', monsterIds: ['city_boss1'], alignmentStatus: 'complete' },
  // 碧濤港
  { assetId: 'MON-HBR-001', groupId: 'MON-HBR', kind: 'monster', key: 'monster_crab', path: 'dist/assets/monster_crab.png', status: 'used', monsterIds: ['crab'], alignmentStatus: 'complete' },
  { assetId: 'MON-HBR-002', groupId: 'MON-HBR', kind: 'monster', key: 'monster_jellyfish', path: 'dist/assets/monster_jellyfish.png', status: 'used', monsterIds: ['jellyfish'], alignmentStatus: 'complete' },
  { assetId: 'MON-HBR-003', groupId: 'MON-HBR', kind: 'monster', key: 'monster_pirate_ghost', path: 'dist/assets/monster_pirate_ghost.png', status: 'used', monsterIds: ['pirate_ghost'], alignmentStatus: 'complete' },
  { assetId: 'MON-HBR-004', groupId: 'MON-HBR', kind: 'monster', key: 'monster_octopus', path: 'dist/assets/monster_octopus.png', status: 'used', monsterIds: ['octopus'], alignmentStatus: 'complete' },
  { assetId: 'MON-HBR-005', groupId: 'MON-HBR', kind: 'monster', key: 'monster_seagull', path: 'dist/assets/monster_seagull.png', status: 'used', monsterIds: ['seagull'], alignmentStatus: 'complete' },
  { assetId: 'MON-HBR-006', groupId: 'MON-HBR', kind: 'miniboss', key: 'miniboss_captain', path: 'dist/assets/miniboss_captain.png', status: 'used', monsterIds: ['pirate_captain'], alignmentStatus: 'complete' },
  // 黃沙遺跡
  { assetId: 'MON-DST-001', groupId: 'MON-DST', kind: 'monster', key: 'monster_scorpion', path: 'dist/assets/monster_scorpion.png', status: 'used', monsterIds: ['scorpion'], alignmentStatus: 'complete' },
  { assetId: 'MON-DST-002', groupId: 'MON-DST', kind: 'monster', key: 'monster_cactus', path: 'dist/assets/monster_cactus.png', status: 'used', monsterIds: ['cactus'], alignmentStatus: 'complete' },
  { assetId: 'MON-DST-003', groupId: 'MON-DST', kind: 'monster', key: 'monster_mummy', path: 'dist/assets/monster_mummy.png', status: 'used', monsterIds: ['mummy'], alignmentStatus: 'complete' },
  { assetId: 'MON-DST-004', groupId: 'MON-DST', kind: 'monster', key: 'monster_bandit', path: 'dist/assets/monster_bandit.png', status: 'used', monsterIds: ['bandit'], alignmentStatus: 'complete' },
  { assetId: 'MON-DST-005', groupId: 'MON-DST', kind: 'monster', key: 'monster_sandworm', path: 'dist/assets/monster_sandworm.png', status: 'used', monsterIds: ['sandworm'], alignmentStatus: 'complete' },
  { assetId: 'MON-DST-006', groupId: 'MON-DST', kind: 'miniboss', key: 'miniboss_sandworm', path: 'dist/assets/miniboss_sandworm.png', status: 'used', monsterIds: ['sandworm_boss'], alignmentStatus: 'complete' },
  // 霜牙峰
  { assetId: 'MON-SNW-001', groupId: 'MON-SNW', kind: 'monster', key: 'monster_snowman', path: 'dist/assets/monster_snowman.png', status: 'used', monsterIds: ['snowman'], alignmentStatus: 'complete' },
  { assetId: 'MON-SNW-002', groupId: 'MON-SNW', kind: 'monster', key: 'monster_penguin', path: 'dist/assets/monster_penguin.png', status: 'used', monsterIds: ['penguin'], alignmentStatus: 'complete' },
  { assetId: 'MON-SNW-003', groupId: 'MON-SNW', kind: 'monster', key: 'monster_icewolf', path: 'dist/assets/monster_icewolf.png', status: 'used', monsterIds: ['icewolf'], alignmentStatus: 'complete' },
  { assetId: 'MON-SNW-004', groupId: 'MON-SNW', kind: 'monster', key: 'monster_crystal', path: 'dist/assets/monster_crystal.png', status: 'used', monsterIds: ['crystal'], alignmentStatus: 'complete' },
  { assetId: 'MON-SNW-005', groupId: 'MON-SNW', kind: 'monster', key: 'monster_yeti', path: 'dist/assets/monster_yeti.png', status: 'used', monsterIds: ['yeti'], alignmentStatus: 'complete' },
  { assetId: 'MON-SNW-006', groupId: 'MON-SNW', kind: 'miniboss', key: 'miniboss_frostgiant', path: 'dist/assets/miniboss_frostgiant.png', status: 'used', monsterIds: ['frost_giant'], alignmentStatus: 'complete' },
  // 熔岩巢穴
  { assetId: 'MON-LAV-001', groupId: 'MON-LAV', kind: 'monster', key: 'monster_fireimp', path: 'dist/assets/monster_fireimp.png', status: 'used', monsterIds: ['fireimp'], alignmentStatus: 'complete' },
  { assetId: 'MON-LAV-002', groupId: 'MON-LAV', kind: 'monster', key: 'monster_lavaslime', path: 'dist/assets/monster_lavaslime.png', status: 'used', monsterIds: ['lavaslime'], alignmentStatus: 'complete' },
  { assetId: 'MON-LAV-003', groupId: 'MON-LAV', kind: 'monster', key: 'monster_firehound', path: 'dist/assets/monster_firehound.png', status: 'used', monsterIds: ['firehound'], alignmentStatus: 'complete' },
  { assetId: 'MON-LAV-004', groupId: 'MON-LAV', kind: 'monster', key: 'monster_ember', path: 'dist/assets/monster_ember.png', status: 'used', monsterIds: ['ember'], alignmentStatus: 'complete' },
  { assetId: 'MON-LAV-005', groupId: 'MON-LAV', kind: 'monster', key: 'monster_lavagolem', path: 'dist/assets/monster_lavagolem.png', status: 'used', monsterIds: ['lavagolem'], alignmentStatus: 'complete' },
  { assetId: 'MON-LAV-006', groupId: 'MON-LAV', kind: 'miniboss', key: 'miniboss_lavadragon', path: 'dist/assets/miniboss_lavadragon.png', status: 'used', monsterIds: ['lava_dragon'], alignmentStatus: 'complete' },
  // 魔君王城
  { assetId: 'MON-CST-001', groupId: 'MON-CST', kind: 'monster', key: 'monster_imp', path: 'dist/assets/monster_imp.png', status: 'used', monsterIds: ['imp'], alignmentStatus: 'complete' },
  { assetId: 'MON-CST-002', groupId: 'MON-CST', kind: 'monster', key: 'monster_bat', path: 'dist/assets/monster_bat.png', status: 'used', monsterIds: ['bat'], alignmentStatus: 'complete' },
  { assetId: 'MON-CST-003', groupId: 'MON-CST', kind: 'monster', key: 'monster_darkknight', path: 'dist/assets/monster_darkknight.png', status: 'used', monsterIds: ['darkknight'], alignmentStatus: 'complete' },
  { assetId: 'MON-CST-004', groupId: 'MON-CST', kind: 'monster', key: 'monster_vampire', path: 'dist/assets/monster_vampire.png', status: 'used', monsterIds: ['vampire'], alignmentStatus: 'complete' },
  { assetId: 'MON-CST-005', groupId: 'MON-CST', kind: 'monster', key: 'monster_gargoyle', path: 'dist/assets/monster_gargoyle.png', status: 'used', monsterIds: ['gargoyle'], alignmentStatus: 'complete' },
  { assetId: 'MON-CST-006', groupId: 'MON-CST', kind: 'miniboss', key: 'miniboss_fallen', path: 'dist/assets/miniboss_fallen.png', status: 'used', monsterIds: ['fallen_commander'], alignmentStatus: 'complete' },
  { assetId: 'MON-JOB-001', groupId: 'MON-JOB', kind: 'miniboss', key: 'miniboss_trialguard', path: 'dist/assets/miniboss_trialguard.png', status: 'used', monsterIds: ['shadow_guardian'], alignmentStatus: 'complete' },
];

export const NPC_ASSETS = [
  {
    assetId: 'NPC-NEW-000',
    groupId: 'NPC-NEW',
    kind: 'npc',
    key: 'npc_new_0',
    path: 'dist/assets/npc_new_0.png',
    status: 'used',
  },
  {
    assetId: 'NPC-NEW-001',
    groupId: 'NPC-NEW',
    kind: 'npc',
    key: 'npc_new_1',
    path: 'dist/assets/npc_new_1.png',
    status: 'used',
  },
  {
    assetId: 'NPC-NEW-002',
    groupId: 'NPC-NEW',
    kind: 'npc',
    key: 'npc_new_2',
    path: 'dist/assets/npc_new_2.png',
    status: 'used',
  },
  {
    assetId: 'NPC-NEW-003',
    groupId: 'NPC-NEW',
    kind: 'npc',
    key: 'npc_new_3',
    path: 'dist/assets/npc_new_3.png',
    status: 'used',
  },
  {
    assetId: 'NPC-NEW-004',
    groupId: 'NPC-NEW',
    kind: 'npc',
    key: 'npc_new_4',
    path: 'dist/assets/npc_new_4.png',
    status: 'used',
  },
  {
    assetId: 'NPC-NEW-005',
    groupId: 'NPC-NEW',
    kind: 'npc',
    key: 'npc_new_5',
    path: 'dist/assets/npc_new_5.png',
    status: 'used',
  },
  {
    assetId: 'NPC-SHP-001',
    groupId: 'NPC-SHP',
    kind: 'npc',
    key: 'npc_merchant',
    path: 'dist/assets/npc_merchant.png',
    status: 'used',
  },
  {
    assetId: 'NPC-TWN-001',
    groupId: 'NPC-TWN',
    kind: 'npc',
    key: 'npc_townsfolk',
    path: 'dist/assets/npc_townsfolk.png',
    status: 'used',
  },
  {
    assetId: 'NPC-HBR-001',
    groupId: 'NPC-HBR',
    kind: 'npc',
    key: 'npc_dockworker',
    path: 'dist/assets/npc_dockworker.png',
    status: 'used',
  },
  {
    assetId: 'NPC-HBR-002',
    groupId: 'NPC-HBR',
    kind: 'npc',
    key: 'npc_sailor',
    path: 'dist/assets/npc_sailor.png',
    status: 'used',
  },
  { assetId: 'NPC-DST-001', groupId: 'NPC-DST', kind: 'npc', key: 'npc_archaeologist', path: 'dist/assets/npc_archaeologist.png', status: 'used' },
  { assetId: 'NPC-DST-002', groupId: 'NPC-DST', kind: 'npc', key: 'npc_caravan', path: 'dist/assets/npc_caravan.png', status: 'used' },
  { assetId: 'NPC-SNW-001', groupId: 'NPC-SNW', kind: 'npc', key: 'npc_ranger', path: 'dist/assets/npc_ranger.png', status: 'used' },
  { assetId: 'NPC-SNW-002', groupId: 'NPC-SNW', kind: 'npc', key: 'npc_monk', path: 'dist/assets/npc_monk.png', status: 'used' },
  { assetId: 'NPC-LAV-001', groupId: 'NPC-LAV', kind: 'npc', key: 'npc_blacksmith', path: 'dist/assets/npc_blacksmith.png', status: 'used' },
  { assetId: 'NPC-LAV-002', groupId: 'NPC-LAV', kind: 'npc', key: 'npc_miner', path: 'dist/assets/npc_miner.png', status: 'used' },
  { assetId: 'NPC-CST-001', groupId: 'NPC-CST', kind: 'npc', key: 'npc_prisoner', path: 'dist/assets/npc_prisoner.png', status: 'used' },
  { assetId: 'NPC-CST-002', groupId: 'NPC-CST', kind: 'npc', key: 'npc_ghostmaid', path: 'dist/assets/npc_ghostmaid.png', status: 'used' },
  {
    assetId: 'NPC-JOB-001',
    groupId: 'NPC-JOB',
    kind: 'npc',
    key: 'npc_shadow_elder',
    path: 'dist/assets/npc_shadow_elder.png',
    status: 'used',
  },
  {
    assetId: 'NPC-JOB-002',
    groupId: 'NPC-JOB',
    kind: 'npc',
    key: 'npc_skill_mentor',
    path: 'dist/assets/npc_skill_mentor.png',
    status: 'used',
  },
];

// 暗影魔君動作圖：每個動作一張，統一 460x220 畫布
export const BOSS_ASSETS = [
  {
    assetId: 'BOSS-SHADOW-IDLE',
    groupId: 'BOSS-SHADOW',
    kind: 'boss',
    key: 'boss_idle',
    path: 'dist/assets/boss_idle.png',
    status: 'used',
    targetMaps: ['boss'],
    pose: 'idle',
  },
  {
    assetId: 'BOSS-SHADOW-MOVE',
    groupId: 'BOSS-SHADOW',
    kind: 'boss',
    key: 'boss_move',
    path: 'dist/assets/boss_move.png',
    status: 'used',
    targetMaps: ['boss'],
    pose: 'move',
  },
  {
    assetId: 'BOSS-SHADOW-ATTACK',
    groupId: 'BOSS-SHADOW',
    kind: 'boss',
    key: 'boss_attack',
    path: 'dist/assets/boss_attack.png',
    status: 'used',
    targetMaps: ['boss'],
    pose: 'attack',
  },
  {
    assetId: 'BOSS-SHADOW-DEATH1',
    groupId: 'BOSS-SHADOW',
    kind: 'boss',
    key: 'boss_death1',
    path: 'dist/assets/boss_death1.png',
    status: 'used',
    targetMaps: ['boss'],
    pose: 'death1',
  },
  {
    assetId: 'BOSS-SHADOW-DEATH2',
    groupId: 'BOSS-SHADOW',
    kind: 'boss',
    key: 'boss_death2',
    path: 'dist/assets/boss_death2.png',
    status: 'used',
    targetMaps: ['boss'],
    pose: 'death2',
  },
  // 第 3 階段（狂暴）的待機 / 移動 / 攻擊姿勢；死亡姿勢沿用一般版
  ...['idle', 'move', 'attack'].map((pose) => ({
    assetId: `BOSS-SHADOW-RAGE-${pose.toUpperCase()}`,
    groupId: 'BOSS-SHADOW',
    kind: 'boss',
    key: `boss_rage_${pose}`,
    path: `dist/assets/boss_rage_${pose}.png`,
    status: 'used',
    targetMaps: ['boss'],
    pose: `rage_${pose}`,
  })),
];

// 裝備掉落圖示：沿用程序材質的 key，載入後 generateItems 會跳過已存在的 key
export const ICON_ASSETS = ['weapon', 'armor', 'gloves', 'helmet', 'boots'].map((slot) => ({
  assetId: `ICO-${slot.toUpperCase()}-001`,
  groupId: 'ICO-EQP',
  kind: 'icon',
  key: `item-${slot}`,
  path: `dist/assets/item_${slot}.png`,
  status: 'used',
}));
// 金幣掉落圖示：同樣沿用程序材質的 key（item-meso）
ICON_ASSETS.push({
  assetId: 'ICO-COIN-001',
  groupId: 'ICO-COIN',
  kind: 'icon',
  key: 'item-meso',
  path: 'dist/assets/item_coin.png',
  status: 'used',
});

// 藥水圖示：key 對應 POTIONS 的快捷鍵
export const POTION_ICON_KEYS = {
  A: 'potion_hp',
  S: 'potion_hp_big',
  D: 'potion_mp',
  R: 'potion_mp_big',
  G: 'potion_elixir',
};

export const POTION_ICON_ASSETS = Object.values(POTION_ICON_KEYS).map((key) => ({
  assetId: `ICO-${key.toUpperCase()}-001`,
  groupId: 'ICO-POT',
  kind: 'icon',
  key,
  path: `dist/assets/${key}.png`,
  status: 'used',
}));

// HUD 木質介面：血條框（3-slice）、技能/藥水格、羊皮紙面板（9-slice）
export const UI_ASSETS = [
  'hud_bar_frame', 'hud_slot_42', 'hud_slot_52', 'hud_slot_80', 'hud_panel', 'hud_panel_sm',
].map((key) => ({
  assetId: `UI-${key.toUpperCase()}-001`,
  groupId: 'UI-HUD',
  kind: 'ui',
  key,
  path: `dist/assets/${key}.png`,
  status: 'used',
}));

// 特效動畫條（橫排影格，純黑底轉亮度 alpha，建議用 ADD 混合）；9 組全部已在遊戲中使用（命中、刺客 / 俠盜技能、轉職）
export const FX_ASSETS = [
  {
    assetId: 'FX-001',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_slash_assassin',
    path: 'dist/assets/fx_slash_assassin.png',
    frameWidth: 160,
    frameHeight: 104,
    frames: 4,
    status: 'used',
  },
  {
    assetId: 'FX-002',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_slash_bandit',
    path: 'dist/assets/fx_slash_bandit.png',
    frameWidth: 160,
    frameHeight: 88,
    frames: 4,
    status: 'used',
  },
  {
    assetId: 'FX-003',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_backstab',
    path: 'dist/assets/fx_backstab.png',
    frameWidth: 127,
    frameHeight: 128,
    frames: 7,
    status: 'used',
  },
  {
    assetId: 'FX-004',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_hit',
    path: 'dist/assets/fx_hit.png',
    frameWidth: 112,
    frameHeight: 111,
    frames: 6,
    status: 'used',
  },
  {
    assetId: 'FX-005',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_poison',
    path: 'dist/assets/fx_poison.png',
    frameWidth: 128,
    frameHeight: 105,
    frames: 5,
    status: 'used',
  },
  {
    assetId: 'FX-006',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_mark',
    path: 'dist/assets/fx_mark.png',
    frameWidth: 96,
    frameHeight: 88,
    frames: 4,
    status: 'used',
  },
  {
    assetId: 'FX-007',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_whirl',
    path: 'dist/assets/fx_whirl.png',
    frameWidth: 176,
    frameHeight: 122,
    frames: 6,
    status: 'used',
  },
  {
    assetId: 'FX-008',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_smoke',
    path: 'dist/assets/fx_smoke.png',
    frameWidth: 128,
    frameHeight: 94,
    frames: 4,
    status: 'used',
  },
  {
    assetId: 'FX-009',
    groupId: 'FX',
    kind: 'fx',
    key: 'fx_job_change',
    path: 'dist/assets/fx_job_change.png',
    frameWidth: 171,
    frameHeight: 144,
    frames: 5,
    status: 'used',
  },
  { assetId: 'FX-STR-001', groupId: 'FX', kind: 'fx', key: 'fx_star_restore', path: 'dist/assets/fx_star_restore.png', frameWidth: 192, frameHeight: 192, frames: 6, status: 'used' },
  { assetId: 'FX-SHK-001', groupId: 'FX', kind: 'fx', key: 'fx_shuriken', path: 'dist/assets/fx_shuriken.png', frameWidth: 32, frameHeight: 32, frames: 4, status: 'used' },
  { assetId: 'FX-VTX-001', groupId: 'FX', kind: 'fx', key: 'fx_vortex', path: 'dist/assets/fx_vortex.png', frameWidth: 192, frameHeight: 192, frames: 6, status: 'used' },
  { assetId: 'FX-AUR-001', groupId: 'FX', kind: 'fx', key: 'fx_boss_aura', path: 'dist/assets/fx_boss_aura.png', frameWidth: 192, frameHeight: 192, frames: 4, status: 'used' },
];


// 轉職後的角色動作圖（刺客 player_assassin_*、俠盜 player_bandit_*）與 HUD 頭像。
// 依職業載入（scope: 'job'）；Player 在缺圖時會退回盜賊的同名動作（見 src/config/poses.js）。
const JOB_POSE_BASE = [
  'idle', 'idle_2', 'walk_1', 'walk_2', 'walk_3', 'walk_4', 'jump', 'fall', 'hurt', 'down', 'die',
  'slash_1', 'slash_2', 'slash_3', 'cast', 'dash', 'throw_1', 'throw_2',
];
export const JOB_POSES = {
  assassin: [...JOB_POSE_BASE, 'backstab', 'lunge', 'guard', 'crouch_low', 'slash_alt_1', 'slash_alt_2'],
  bandit: [...JOB_POSE_BASE, 'spin_1', 'spin_2', 'slash_alt', 'crouch_sabre', 'guard'],
};
// 目前程式實際用到的姿勢；其餘先預載備用（status: 'unused'）
const JOB_POSES_USED = new Set([
  'idle', 'idle_2', 'die', 'walk_1', 'walk_2', 'walk_3', 'walk_4', 'jump', 'fall', 'hurt', 'down', 'slash_1', 'slash_2', 'slash_3',
  'cast', 'dash', 'throw_1', 'throw_2', 'crouch_low', 'backstab', 'spin_1', 'spin_2',
]);
export const JOB_CHARACTER_ASSETS = [
  ...Object.entries(JOB_POSES).flatMap(([job, poses]) => poses.map((pose, i) => ({
    assetId: `CHR-${job.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
    groupId: `CHR-${job.slice(0, 3).toUpperCase()}`,
    kind: 'character',
    key: `player_${job}_${pose}`,
    path: `dist/assets/player_${job}_${pose}.png`,
    status: JOB_POSES_USED.has(pose) ? 'used' : 'unused',
  }))),
  ...['assassin', 'bandit'].map((job) => ({
    assetId: `CHR-PORTRAIT-${job.toUpperCase()}`,
    groupId: 'CHR-PORTRAIT',
    kind: 'character',
    key: `portrait_${job}`,
    path: `dist/assets/portrait_${job}.png`,
    status: 'used',
  })),
];
CHARACTER_ASSETS.push(...JOB_CHARACTER_ASSETS);

// 技能圖示 PNG（手繪圖到位後把 id 加進來；沒列的由 src/assets/skillIcons.js 程式繪製）
// 檔名規則：dist/assets/skill_icon_<id>.png，38x38；ATK 欄依職業用 ATK_assassin / ATK_bandit
export const SKILL_ICON_PNG_IDS = [
  'ATK', 'Z', 'X', 'C', 'V', 'B', 'backstab', 'poison', 'mark', 'whirl', 'steal', 'smoke',
  'ATK_assassin', 'ATK_bandit',   // 暫用同一張普通攻擊圖，之後可換成雙刃 / 彎刀專屬圖
];
export const SKILL_ICON_ASSETS = SKILL_ICON_PNG_IDS.map((id) => ({
  assetId: `ICO-SKILL-${id.toUpperCase()}`,
  groupId: 'ICO-SKILL',
  kind: 'icon',
  key: `skill_icon_${id}`,
  path: `dist/assets/skill_icon_${id}.png`,
  status: 'used',
}));

// 任務物品圖示（key 與程式暫代圖相同時，以這裡載入的 PNG 為準）
export const QUEST_ITEM_ASSETS = [
  {
    assetId: 'ITM-QST-001',
    groupId: 'ITM-QST',
    kind: 'icon',
    key: 'item-quest-token',
    path: 'dist/assets/item_trial_token.png',
    status: 'used',
  },
];

// 星光碎片圖示（key 是遊戲內貼圖名；檔案 dist/assets/item_star_shard.png）
QUEST_ITEM_ASSETS.push({
  assetId: 'ITM-SHD-001',
  groupId: 'ITM-SHD',
  kind: 'icon',
  key: 'item-star-shard',
  path: 'dist/assets/item_star_shard.png',
  status: 'used',
});

// 場景擺設與世界地圖 UI（world map 的底圖 / 節點圖示；星光之塔）
export const PROP_UI_ASSETS = [
  { assetId: 'PRP-TWR-001', groupId: 'PRP-TWR', kind: 'prop', key: 'prop_star_tower', path: 'dist/assets/prop_star_tower.png', status: 'used' },
  { assetId: 'UI-WMP-001', groupId: 'UI-WMP', kind: 'ui', key: 'ui_world_map', path: 'dist/assets/ui_world_map.webp', status: 'used' },
  { assetId: 'UI-WMP-002', groupId: 'UI-WMP', kind: 'ui', key: 'ui_map_node_unlocked', path: 'dist/assets/ui_map_node_unlocked.png', status: 'used' },
  { assetId: 'UI-WMP-003', groupId: 'UI-WMP', kind: 'ui', key: 'ui_map_node_current', path: 'dist/assets/ui_map_node_current.png', status: 'used' },
  { assetId: 'UI-WMP-004', groupId: 'UI-WMP', kind: 'ui', key: 'ui_map_node_locked', path: 'dist/assets/ui_map_node_locked.png', status: 'used' },
  { assetId: 'UI-QST-001', groupId: 'UI-QST', kind: 'ui', key: 'ui_quest_mark', path: 'dist/assets/ui_quest_mark.png', status: 'used' },
  { assetId: 'UI-QST-002', groupId: 'UI-QST', kind: 'ui', key: 'ui_quest_ing', path: 'dist/assets/ui_quest_ing.png', status: 'used' },
  { assetId: 'UI-QST-003', groupId: 'UI-QST', kind: 'ui', key: 'ui_quest_done', path: 'dist/assets/ui_quest_done.png', status: 'used' },
];

// 每張地圖專屬的跳台圖：左端、中段（可重複鋪）、右端由同一張圖切出
// surfaceTop：圖片頂端到可站立表面的距離（px）
export const PLATFORM_THEMES = {
  sky:     { key: 'platform_sky',     surfaceTop: 7 },
  forest: { key: 'platform_forest',  surfaceTop: 12 },
  ruins:   { key: 'platform_ruins',   surfaceTop: 0 },
  mystic: { key: 'platform_mystic',  surfaceTop: 10 },
  alley: { key: 'platform_city',    surfaceTop: 11 },
  taipei:  { key: 'platform_taipei',  surfaceTop: 8 },
  town:    { key: 'platform_town',    surfaceTop: 1 },
  // platform_shrine 也是 246×30 的細條，同樣縱向拉厚
  shrine:  { key: 'platform_shrine',  surfaceTop: 2, stretchH: 36 },
  harbor:  { key: 'platform_harbor',  surfaceTop: 3 },
  // 四張新圖的跳台圖是 246×21～22 的細長條：stretchH 把它縱向拉到和其他跳台差不多的厚度
  desert:  { key: 'platform_desert',  surfaceTop: 2, stretchH: 36 },
  snow:    { key: 'platform_snow',    surfaceTop: 3, stretchH: 38 },
  lava:    { key: 'platform_lava',    surfaceTop: 2, stretchH: 38 },
  castle:  { key: 'platform_castle',  surfaceTop: 2, stretchH: 36 },
  boss:    { key: 'platform_boss',    surfaceTop: 0 },
  dungeon: { key: 'platform_dungeon', surfaceTop: 0 },
};

// ── 載入範圍（scope）標籤 ──────────────────────────────────────────────────────────
// 全部素材一次解碼會吃掉上百 MB 記憶體（手機 / iframe 分頁因此當掉），所以改成依需要載入：
//   boot  開機就載入、常駐（主選單與 HUD 要用的小圖）
//   core  第一次進入遊戲地圖時載入、常駐（盜賊共用特效、世界地圖底圖）
//   job   jobs 列出的職業才載入（轉職圖、技能特效）；換職業時載入新的、釋放舊的
//   map   進入地圖時才載入，離開（且不是鄰近地圖）後釋放；maps 為靜態標註的地圖，
//         怪物 / NPC / 背景 / 跳台另外由 src/engine/assetPlan.js 從地圖與怪物資料推出
//   lazy  只有呼叫端明確要求才載入（目前沒有程式用到的素材）
// 新增素材沒標 scope 時，依 kind 取預設值（見 defaultScope）。
export const ASSET_SCOPES = ['boot', 'core', 'job', 'map', 'lazy'];

const JOB_FX = { assassin: ['fx_slash_assassin', 'fx_backstab', 'fx_poison', 'fx_mark'], bandit: ['fx_slash_bandit', 'fx_whirl', 'fx_smoke'] };
// fx_boss_aura：Boss 換階段與區域頭目狂暴時都會播（以前標成 lazy 卻沒有人載入，所以從來沒出現過）
const CORE_KEYS = new Set(['fx_hit', 'fx_job_change', 'fx_star_restore', 'ui_world_map', 'fx_boss_aura']);
const LAZY_KEYS = new Set([]);   // fx_shuriken / fx_vortex 是盜賊技能特效，走 core
// 地圖專屬的怪物 / 圖：key → 額外地圖（BossScene 的援軍是暗影史萊姆，怪物資料裡沒有 boss 地圖）
const EXTRA_MAPS = { monster_slime: ['boss'] };

function defaultScope(a) {
  const jobPose = /^player_(assassin|bandit)_/.exec(a.key);
  if (jobPose) return { scope: 'job', jobs: [jobPose[1]] };
  if (a.kind === 'fx') {
    for (const [job, keys] of Object.entries(JOB_FX)) if (keys.includes(a.key)) return { scope: 'job', jobs: [job] };
    if (LAZY_KEYS.has(a.key)) return { scope: 'lazy' };
    return { scope: 'core' };
  }
  if (CORE_KEYS.has(a.key)) return { scope: 'core' };
  if (a.kind === 'background') return a.targetMaps && a.targetMaps[0] === 'menu' ? { scope: 'boot' } : { scope: 'map', maps: a.targetMaps || [] };
  if (a.kind === 'platform') {
    const maps = Object.entries(PLATFORM_THEMES).filter(([, t]) => t.key === a.key).map(([m]) => m);
    return { scope: 'map', maps };
  }
  if (a.kind === 'boss') return { scope: 'map', maps: a.targetMaps || ['boss'] };
  if (a.kind === 'monster') return { scope: 'map', maps: EXTRA_MAPS[a.key] || [] };
  if (a.kind === 'npc' || a.kind === 'prop') return { scope: 'map', maps: [] };
  return { scope: 'boot' };
}

export const ALL_ASSETS = [
  ...CHARACTER_ASSETS, ...STORY_ASSETS, ...BACKGROUND_ASSETS, ...PLATFORM_ASSETS, ...MONSTER_ASSETS, ...BOSS_ASSETS, ...NPC_ASSETS,
  ...ICON_ASSETS, ...POTION_ICON_ASSETS, ...UI_ASSETS, ...SKILL_ICON_ASSETS, ...QUEST_ITEM_ASSETS, ...PROP_UI_ASSETS,
  ...FX_ASSETS,
];
for (const a of ALL_ASSETS) { if (!a.scope) Object.assign(a, defaultScope(a)); }
export const ASSET_BY_KEY = new Map(ALL_ASSETS.map((a) => [a.key, a]));
export const isSpritesheet = (a) => a.frameWidth !== undefined;

// 開機只載入 boot 範圍的圖；其餘由 src/engine/assetLoader.js 依場景需要載入
const BOOT = ALL_ASSETS.filter((a) => a.scope === 'boot');
export const PRELOAD_IMAGE_ASSETS = BOOT.filter((a) => !isSpritesheet(a));
export const PRELOAD_SPRITESHEET_ASSETS = BOOT.filter((a) => isSpritesheet(a) && a.status === 'used');

export const PENDING_ALIGNMENT_ASSETS = MONSTER_ASSETS.filter(
  (asset) => asset.alignmentStatus === 'pending-alignment',
);
