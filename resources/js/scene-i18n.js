(() => {
  const scenes = {
    ko: {
      scene_overview: '자연광 아래 펼쳐진 태양광 발전소 3D 모델',
      scene_modules: '태양광 셀, 유리와 금속 프레임을 보여주는 모듈 3D 모델',
      scene_rooftop: '산업용 건물 지붕의 태양광 설비 3D 모델',
      scene_pvsyst: '태양의 이동에 따른 패널 음영 분석 3D 모델',
      scene_drone: '태양광 설비를 점검하는 드론의 3D 모델',
      scene_cctv: '태양광 패널과 회전 카메라를 갖춘 이동형 CCTV 3D 모델',
      scene_pathfinder: '지붕과 주변 건물의 태양광 입지 분석 3D 모델',
      scene_contact: '태양광 모듈과 전력 변환 장치 3D 모델',
      sceneConcept: '3D 장면은 솔루션의 구조와 작동 원리를 설명하기 위한 개념 모델입니다.',
      sceneNote: '햇빛에서 전력으로, 이어지는 에너지',
    },
    en: {
      scene_overview: '3D solar farm model in natural daylight',
      scene_modules: '3D solar module with cells, glass and a metal frame',
      scene_rooftop: '3D rooftop solar installation on an industrial building',
      scene_pvsyst: '3D study of changing sunlight and panel shadows',
      scene_drone: '3D drone inspecting a solar installation',
      scene_cctv: '3D mobile CCTV with solar power and a rotating camera',
      scene_pathfinder: '3D solar site study of a rooftop and neighboring buildings',
      scene_contact: '3D solar module and power conversion equipment',
      sceneConcept: 'The 3D scenes are conceptual models showing each solution’s structure and operation.',
      sceneNote: 'From sunlight to power, energy in motion',
    },
    ja: {
      scene_overview: '自然光に照らされた太陽光発電所の3Dモデル',
      scene_modules: 'セル、ガラス、金属フレームを示す太陽光モジュールの3Dモデル',
      scene_rooftop: '産業用建物の屋根に設置した太陽光設備の3Dモデル',
      scene_pvsyst: '太陽の動きとパネルの影を分析する3Dモデル',
      scene_drone: '太陽光設備を点検するドローンの3Dモデル',
      scene_cctv: '太陽光パネルと旋回カメラを備えた移動型CCTVの3Dモデル',
      scene_pathfinder: '屋根と周辺建物の太陽光立地を分析する3Dモデル',
      scene_contact: '太陽光モジュールと電力変換装置の3Dモデル',
      sceneConcept: '3Dシーンは、各ソリューションの構造と動作を説明する概念モデルです。',
      sceneNote: '太陽の光から電力へ、つながるエネルギー',
    },
  };
  for (const [language, entries] of Object.entries(scenes)) Object.assign(window.SCE_TRANSLATIONS[language], entries);
})();
