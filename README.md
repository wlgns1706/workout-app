# 운동 기록

개인용 운동 기록 PWA. Android 폰의 홈 화면에 설치해서 쓴다.

- 기록은 폰 안에만 저장된다. 서버와 로그인이 없다.
- 운동 프로그램은 앱에 들어 있지 않다. 프로그램 파일(.json)을 앱에서 가져온다.
- 설계 문서: [docs/design.md](docs/design.md)
- 사용법: [docs/guide.md](docs/guide.md)

## 개발

```bash
npm install
npm run dev
npm test
npm run build
```

## 프로그램 파일 만들기

엑셀 파일은 저장소에 넣지 않는다.

```bash
python tools/convert_program.py <엑셀 경로> <출력.program.json> --id <id> --name "<이름>"
python tools/check_convert.py <엑셀 경로> <출력.program.json>
```

## 배포

`main`에 올리면 GitHub Actions가 테스트를 돌리고 GitHub Pages에 배포한다.
