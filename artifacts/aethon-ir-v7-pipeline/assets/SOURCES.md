# 구조도 v3 아이콘 출처

- AWS Architecture Icons: https://aws.amazon.com/architecture/icons/ . 공식 패키지 2026-07-31 릴리스에서 CloudFront, S3, ALB, ECS, Fargate, SQS, RDS, CloudWatch의 64px SVG를 추출했다. 공식 페이지는 다이어그램과 발표자료에서의 사용을 설명한다.
- Databricks: https://www.databricks.com/sites/default/files/2026-05/Databricks-Logo-Icon.svg . 브랜드 사용 지침은 https://brand.databricks.com/ . 원본 SVG의 비율과 색상을 유지했다.
- Python Software Foundation: https://www.python.org/community/logos/ 에서 연결된 공식 심볼 PNG `https://s3.dualstack.us-east-2.amazonaws.com/pythondotorg-assets/media/community/logos/python-logo-only.png`. 원본 이미지를 비율 유지해 표시했다.
- SQLite: https://www.sqlite.org/images/sqlite370_banner.svg . SQLite 공식 홈페이지에서 사용하는 배너를 원본 비율로 표시했다. `sqlite370_banner.png`는 SVG의 PNG 변환본이다.
- 노란 `JS` 사각형은 기술 명칭을 식별하기 위해 직접 그린 문자 배지이며 공식 제공 로고 파일이 아니다.

구조도는 서비스의 현재 구성 또는 향후 제안 기술을 식별하기 위한 것이며, 이들 기업과 Aethon의 제휴를 뜻하지 않는다. 사용조건과 배포 권리는 제출 전에 재검토한다.

## v7 도식(architecture-*.svg)

- AWS(CloudFront·ECS·RDS·SQS·S3)와 Databricks 아이콘은 위 목록의 SVG를 그대로 넣었다. 빌드 입력은 같은 폴더의 `build-inputs/icon-assets-v3/`에 있다.
- 개요도(`architecture-overview.svg`)의 기술 표시 글리프 6개(웹 작업대 칸 3개, 기획·요청·편집·검토·저장·전달 칸 각 1개)는 이전 v3 현재 구조도(`build-inputs/aethon-architecture-current-v3.svg`)의 24px 단일 경로 글리프를 옮긴 것이다. 원 출처와 라이선스는 [미확인]이므로 재사용 전에 확인한다.
- 위 목록의 Python 공식 심볼 PNG와 SQLite 배너(`sqlite370_banner.png`)는 v3 결합 구조도용이며 이 폴더에 없다.
