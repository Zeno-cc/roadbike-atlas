import type { GlossaryEntry } from './schema'

/**
 * 术语表：中英对照 + 一句话解释 + 所属系统。
 * system 为 'general' 表示跨系统的通用概念/工具。
 */
export const glossary: GlossaryEntry[] = [
  // ── 车架系统 ────────────────────────────────────────────────
  {
    term: '车架',
    en: 'Frame',
    desc: '整车的骨架，由管型与各种安装接口构成；决定骑行几何、操控特性与整车重量。',
    system: 'frame',
  },
  {
    term: '前叉',
    en: 'Fork',
    desc: '连接前轮与车把的部件，承担转向与制动载荷，并靠叉腿的弹性变形过滤路面震动。',
    system: 'frame',
  },
  {
    term: '头管',
    en: 'Head Tube',
    abbr: 'HT',
    desc: '车架前端的短管，内部安装碗组轴承、穿入前叉舵管；头管角度决定转向的灵敏度与稳定性。',
    system: 'frame',
  },
  {
    term: '上管',
    en: 'Top Tube',
    abbr: 'TT',
    desc: '连接头管与立管的横向管材，其长度（配合把立）决定车把到坐垫的距离。',
    system: 'frame',
  },
  {
    term: '下管',
    en: 'Down Tube',
    abbr: 'DT',
    desc: '连接头管与五通的最粗壮管材，承受大部分踩踏扭矩，也是接水壶架与走线的位置。',
    system: 'frame',
  },
  {
    term: '立管',
    en: 'Seat Tube',
    abbr: 'ST',
    desc: '车架中部的竖直管材，顶端插入座管、底端连接五通；立管角度决定坐姿的前后位置。',
    system: 'frame',
  },
  {
    term: '五通',
    en: 'Bottom Bracket Shell',
    desc: '车架底部的圆柱形中轴安装座，是踩踏力的汇聚中心；规格有 BSA、T47、PF30 等，决定可用中轴。',
    system: 'frame',
  },
  {
    term: '中轴',
    en: 'Bottom Bracket',
    abbr: 'BB',
    desc: '五通内的轴承系统，让曲柄轴心顺畅旋转并把踩踏力传给车架；是曲柄的旋转中心。',
    system: 'frame',
  },
  {
    term: '碗组',
    en: 'Headset',
    abbr: 'HS',
    desc: '前叉与头管之间的角接触轴承组，让转向顺滑并能消除间隙。',
    system: 'frame',
  },
  {
    term: '座圈',
    en: 'Crown Race',
    desc: '压在舵管底部的锥形环，把碗组下轴承与前叉对中并承力，方向装反会导致转向卡顿。',
    system: 'frame',
  },
  {
    term: '堆高',
    en: 'Stack',
    desc: '五通中心到头管顶端的垂直高度，决定骑行姿势的直立程度；数值越大越舒适，越小越激进。',
    system: 'frame',
  },
  {
    term: '前伸量（车架）',
    en: 'Reach',
    desc: '五通中心到头管顶端的水平距离，与堆高一起构成车架尺寸的核心指标，用来跨品牌对比几何。',
    system: 'frame',
  },
  {
    term: '拖曳距',
    en: 'Trail',
    desc: '前轮接地点与转向轴线延长线之间的水平距离，由头管角与前叉偏移量共同决定：越大越稳定、越小越灵敏。',
    system: 'frame',
  },

  // ── 轮组系统 ────────────────────────────────────────────────
  {
    term: '花鼓',
    en: 'Hub',
    desc: '轮组的旋转中心：内含轴心与轴承，后花鼓还通过棘轮机构接收链条传来的动力。',
    system: 'wheels',
  },
  {
    term: '塔基',
    en: 'Freehub Body',
    desc: '后花鼓上承载飞轮的棘轮座，滑行时靠棘爪或星形棘轮让车轮空转、踩踏时立即咬合传力。',
    system: 'wheels',
  },
  {
    term: '轮圈',
    en: 'Rim',
    desc: '轮组的外环，通过辐条张力承受载荷；分开口（Clincher）、真空兼容（Tubeless）与管胎（Tubular）三类。',
    system: 'wheels',
  },
  {
    term: '辐条',
    en: 'Spoke',
    desc: '连接花鼓与轮圈的细长钢丝，靠预张力把载荷均匀分散到整圈，是轮组刚性与耐用度的关键。',
    system: 'wheels',
  },
  {
    term: '条帽',
    en: 'Nipple',
    desc: '穿过轮圈固定的辐条末端螺母，旋转它可以调整辐条张力、修正轮圈偏摆与偏距。',
    system: 'wheels',
  },
  {
    term: '轮胎',
    en: 'Tire',
    desc: '唯一接触地面的部件；宽度、胎压与胎面配方决定滚阻、抓地与舒适性。',
    system: 'wheels',
  },
  {
    term: '帘布密度',
    en: 'Threads Per Inch',
    abbr: 'TPI',
    desc: '轮胎胎体每英寸的帘布纱线数；数值越高胎体越柔顺、滚阻与路感越好，但耐切割性下降。',
    system: 'wheels',
  },
  {
    term: '内胎',
    en: 'Inner Tube',
    desc: '放在开口胎内部、充气后撑起轮胎的薄壁橡胶管；分丁基胶（耐气）与乳胶（低滚阻）两类。',
    system: 'wheels',
  },
  {
    term: '真空胎',
    en: 'Tubeless',
    desc: '不装内胎、靠胎唇与轮圈密封并由自补液堵漏的轮胎系统；可低胎压骑行、滚阻低，但安装与维护要求更高。',
    system: 'wheels',
  },
  {
    term: '法嘴',
    en: 'Presta Valve',
    desc: '细长、带锁紧螺母的气门嘴，是公路车与高气压轮组的标配，需要专用气筒嘴或转换头。',
    system: 'wheels',
  },
  {
    term: '桶轴',
    en: 'Thru-Axle',
    desc: '穿过花鼓轴心并旋入车架勾爪的螺纹轴杆，刚性远高于快拆；公路车标准为 12×100mm（前）与 142×12mm（后）。',
    system: 'wheels',
  },
  {
    term: '快拆',
    en: 'Quick Release',
    abbr: 'QR',
    desc: '靠凸轮拉杆把轮轴夹紧在勾爪上的传统固定方式（9×100mm 前 / 130mm 后），现代碟刹公路车多已被桶轴取代。',
    system: 'wheels',
  },
  {
    term: '轮组偏距',
    en: 'Wheel Dish',
    desc: '后轮圈相对花鼓锁紧面中线的横向偏移量，用来补偿飞轮侧较陡的辐条角度，使两侧张力尽量均衡。',
    system: 'wheels',
  },
  {
    term: '张力均衡',
    en: 'Tension Balance',
    desc: '指轮组左右两侧辐条张力按设计比例保持均衡（常见驱动侧更高），偏摆、偏距与张力三者需一起校。',
    system: 'wheels',
  },

  // ── 传动系统 ────────────────────────────────────────────────
  {
    term: '牙盘曲柄',
    en: 'Crankset',
    desc: '由曲柄、盘爪与盘片组成的踩踏主件，把脚踏的力经链条中心线传给链条。',
    system: 'drivetrain',
  },
  {
    term: '盘片',
    en: 'Chainring',
    desc: '固定在曲柄上带齿的圆盘，齿数决定齿比的输入端；离合器前拨负责在大小盘片之间切换。',
    system: 'drivetrain',
  },
  {
    term: '螺栓圆直径',
    en: 'Bolt Circle Diameter',
    abbr: 'BCD',
    desc: '盘片螺栓孔分布圆的直径；必须与曲柄爪匹配（如 110mm 紧凑盘、130mm 标准盘），是盘片换装的第一参数。',
    system: 'drivetrain',
  },
  {
    term: '脚踏',
    en: 'Pedal',
    desc: '提供踩踏支撑面并带锁片卡扣机构的部件；把双腿的力通过锁鞋与锁片传入曲柄。',
    system: 'drivetrain',
  },
  {
    term: '锁片',
    en: 'Cleat',
    desc: '固定在锁鞋底部、卡入脚踏的接口片；浮动角度与释放力度由锁片型号决定，影响膝盖受力与安全性。',
    system: 'drivetrain',
  },
  {
    term: '飞轮',
    en: 'Cassette',
    desc: '装在后花鼓塔基上的一组齿片，提供从小到大的一系列齿比，由后拨导链换挡。',
    system: 'drivetrain',
  },
  {
    term: '齿片',
    en: 'Cog',
    desc: '飞轮上的单片齿轮；相邻齿片齿数差与齿数范围决定变速的疏密与爬坡能力。',
    system: 'drivetrain',
  },
  {
    term: '链条',
    en: 'Chain',
    desc: '在牙盘与飞轮之间传递动力的滚子链；靠拉伸量（节距磨损）判断寿命，磨损后需连同飞轮一起评估更换。',
    system: 'drivetrain',
  },
  {
    term: '快扣',
    en: 'Quick Link',
    desc: '可徒手或专用钳拆装的链条连接扣（如 KMC Missing Link、SRAM PowerLock），方便清洗与路边救援。',
    system: 'drivetrain',
  },
  {
    term: '前拨',
    en: 'Front Derailleur',
    abbr: 'FD',
    desc: '由导板与连杆构成的拨链器，把链条在大小盘片之间横向推移，实现前变速。',
    system: 'drivetrain',
  },
  {
    term: '后拨',
    en: 'Rear Derailleur',
    abbr: 'RD',
    desc: '由导轮、导板、平行四边形连杆与拉簧构成，在飞轮上横向换挡并维持链条张力，是变速精度的核心。',
    system: 'drivetrain',
  },
  {
    term: '导轮',
    en: 'Jockey Wheel',
    desc: '后拨导板上的两枚小齿轮；上方为导向轮（改变链条走向），下方为张力轮（维持链条张力）。',
    system: 'drivetrain',
  },
  {
    term: '导板',
    en: 'Cage',
    desc: '后拨上固定导轮的框架；长度（短腿/中腿/长腿）决定可容纳的链条伸缩量，即后拨齿容。',
    system: 'drivetrain',
  },
  {
    term: '手变头',
    en: 'Shimano Total Integration',
    abbr: 'STI',
    desc: '把刹车与变速集成在同一手柄上的双控手柄（手变），一次握持即可完成制动与升降挡。',
    system: 'drivetrain',
  },
  {
    term: '电子变速',
    en: 'Di2',
    desc: 'Shimano 的电子变速系统，用电机与电信号代替机械拉线；变速精准可自动微调，需要充电与固件维护。',
    system: 'drivetrain',
  },
  {
    term: '齿比',
    en: 'Gear Ratio',
    desc: '牙盘齿数 ÷ 飞轮齿数；同踏频下齿比越大车速越高越费力，越小越轻松越适合爬坡。',
    system: 'drivetrain',
  },
  {
    term: '踏频',
    en: 'Cadence',
    desc: '每分钟曲柄转数（rpm）；公路车常用 80-100rpm，结合齿比共同决定速度与体力消耗方式。',
    system: 'drivetrain',
  },
  {
    term: '飞轮齿容',
    en: 'Cassette Range',
    desc: '飞轮的齿数跨度（如 11-34T）与后拨的总齿容（大小盘齿数差 + 飞轮齿数差）；超出齿容会导致链条过松或过紧。',
    system: 'drivetrain',
  },
  {
    term: '链条中心线',
    en: 'Chainline',
    desc: '牙盘齿片中心到车架中线的水平距离；链条越接近直线，传动效率越高、磨损越慢，是传动匹配的关键指标。',
    system: 'drivetrain',
  },
  {
    term: 'Q 值',
    en: 'Q-Factor',
    desc: '左右曲柄外侧面之间的距离；Q 值越小双脚越接近自然站立间距，髋关节越自然，气动也略好。',
    system: 'drivetrain',
  },
  {
    term: '限位螺丝',
    en: 'Limit Screw',
    desc: '后拨与前拨上的高（H）、低（L）两颗螺丝，用机械挡块限定拨链器行程，防止链条掉出飞轮或盘片。',
    system: 'drivetrain',
  },
  {
    term: '半档',
    en: 'Trim',
    desc: '手变在两片盘片位置之间提供的中间微调档，用来消除链条在大飞或小飞时的摩擦与噪音。',
    system: 'drivetrain',
  },
  {
    term: '浮动',
    en: 'Float',
    desc: '锁片允许脚在脚踏上左右转动的角度（常见 0-6°）；适度浮动保护膝盖，过大则发力不稳。',
    system: 'drivetrain',
  },

  // ── 刹车系统 ────────────────────────────────────────────────
  {
    term: '刹车夹器',
    en: 'Caliper',
    desc: '固定制动件的总成：机械版由线拉动单侧来令片，油压版由活塞推动两片同时夹住碟片。',
    system: 'brakes',
  },
  {
    term: '碟片',
    en: 'Rotor',
    desc: '固定在花鼓上的金属摩擦盘，把动能转化为热量；常见直径 140/160mm，越大制动力越强散热越好。',
    system: 'brakes',
  },
  {
    term: '中锁',
    en: 'Center Lock',
    desc: 'Shimano 的碟片安装标准：用带齿的锁环把碟片锁到花鼓上，比六钉（6-Bolt）拆装更快、对中更稳。',
    system: 'brakes',
  },
  {
    term: '树脂来令片',
    en: 'Resin Pads',
    desc: '以树脂/有机材料制成的来令片，安静、初期咬合柔和，但耐热性弱于金属烧结合金片。',
    system: 'brakes',
  },
  {
    term: '排气',
    en: 'Bleeding',
    desc: '油压刹车维护流程：把管路中的空气排出并补充刹车油，恢复线性的手感与制动力。',
    system: 'brakes',
  },
  {
    term: '油管',
    en: 'Hose',
    desc: '油压刹车上连接刹把与夹器的耐压软管，通过内部的刹车油传递压力，截管后需压入油针重新连接。',
    system: 'brakes',
  },
  {
    term: '磨合',
    en: 'Bed-in',
    desc: '新碟片与新来令片的初期磨合：通过几次中速制动把摩擦材料均匀转移到碟片表面，建立完整制动力。',
    system: 'brakes',
  },
  {
    term: '刹把',
    en: 'Brake Lever',
    desc: '车把上的制动手柄；油压系统中它还集成了油缸与活塞，是制动力传递的起点。',
    system: 'brakes',
  },
  {
    term: '接触点',
    en: 'Contact Point',
    desc: '刹把行程中开始产生制动力的位置；部分刹把可调接触点，让不同手掌大小的骑手都拿到舒适手感。',
    system: 'brakes',
  },

  // ── 操控系统 ────────────────────────────────────────────────
  {
    term: '车把',
    en: 'Handlebar',
    desc: '转向与握持的部件；宽度通常与肩宽匹配，弯把提供上把、下把等多个握持位置。',
    system: 'cockpit',
  },
  {
    term: '下把位',
    en: 'Drop',
    desc: '弯把向下弯曲的握持区，也是下坡与冲刺的姿势：重心更低、风阻与刹车可达性最好。',
    system: 'cockpit',
  },
  {
    term: '车把前伸量',
    en: 'Bar Reach',
    desc: '车把中心到刹把安装位置的向前水平距离；数值越大身体越低越前，操控更稳但姿势更激进。',
    system: 'cockpit',
  },
  {
    term: '把立',
    en: 'Stem',
    desc: '连接车把与舵管的短臂件；长度与角度决定车把位置与转向灵敏度，通常 80-130mm。',
    system: 'cockpit',
  },
  {
    term: '垫圈',
    en: 'Spacer',
    desc: '套在舵管上、位于碗组压顶盖与把立之间的环件；数量决定车把高度，调整后必须复核舵管长度与安全。',
    system: 'cockpit',
  },
  {
    term: '把带',
    en: 'Bar Tape',
    desc: '缠在弯把（或弯把+一体把）上的防滑减震条；厚度与缠绕层数决定震动吸收与握持手感。',
    system: 'cockpit',
  },

  // ── 座舱系统 ────────────────────────────────────────────────
  {
    term: '座管',
    en: 'Seatpost',
    desc: '连接坐垫与立管的管件，设定坐垫高度与前后位置，并靠自身弹性吸收震动。',
    system: 'seating',
  },
  {
    term: '后移量',
    en: 'Setback',
    desc: '座管夹头中心相对座管轴线的水平偏移（常见 0/15/25mm），用来把坐垫向后推、补偿立管角度。',
    system: 'seating',
  },
  {
    term: '坐垫',
    en: 'Saddle',
    desc: '支撑骑手体重的接触面；宽度、形状与中央凹槽决定坐骨压力分布与长时间骑行舒适度。',
    system: 'seating',
  },
  {
    term: '座管夹',
    en: 'Seatpost Clamp',
    desc: '环抱立管顶部、把座管压紧的夹环；分外挂夹环与车架一体式（夹耳/隐藏楔块）两类，扭矩通常 5-7Nm。',
    system: 'seating',
  },
  {
    term: '最小插入深度',
    en: 'Minimum Insert',
    desc: '座管安全插入立管的最小长度（通常 75-100mm，或以刻度线标注）；低于该线会撬裂立管或折断座管。',
    system: 'seating',
  },

  // ── 通用概念 ────────────────────────────────────────────────
  {
    term: '扭矩',
    en: 'Torque',
    desc: '螺栓紧固的旋转力矩（Nm）；公路车小螺栓多在 2-15Nm，碳纤维件与碳轨必须按标注扭矩、绝不超扭。',
    system: 'general',
  },
  {
    term: '碳纤维装配膏',
    en: 'Carbon Paste',
    desc: '含微小颗粒的增摩膏，用于碳-碳界面，既提高摩擦防止座管/把立下滑，又能避免潮湿环境下的界面咬合。',
    system: 'general',
  },
  {
    term: '线管',
    en: 'Cable Housing',
    desc: '包裹变速内线与刹车内线的外层护套，决定走线手感与摩擦；线管过长或弯折过急会让变速变钝。',
    system: 'general',
  },
  {
    term: '内走线',
    en: 'Internal Routing',
    desc: '把刹车油管与变速线穿在车架管型内部的走线方式：外观整洁、气动，但维护时需掌握穿线与拉线技巧。',
    system: 'general',
  },
]
