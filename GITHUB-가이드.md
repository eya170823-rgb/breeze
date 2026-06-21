# GitHub 연동 · 인터넷 게시 가이드

이 프로젝트는 이미 **git 저장소로 초기화**되어 있습니다.
이제 GitHub에 올리면 ① 코드 백업 ② 무료 인터넷 주소(GitHub Pages) 두 가지를 한 번에 얻습니다.

---

## 0. 준비물 (한 번만)

1. **GitHub 계정** — https://github.com 에서 가입 (무료)
2. **Git** — 이미 설치되어 있습니다. (`git --version` 으로 확인)
3. VS Code를 쓰신다면 왼쪽 **Source Control(소스 제어)** 아이콘만으로도 가능합니다.

---

## 1. 첫 커밋 만들기

VS Code 터미널(또는 PowerShell)에서 이 폴더 안에서 실행합니다.

```powershell
git config user.name "브리즈부동산"
git config user.email "eya170823@gmail.com"
git commit -m "BREEZE 홈페이지 첫 배포"
```

> 파일은 이미 `git add` 된 상태라 바로 `commit` 하면 됩니다.

---

## 2. GitHub에 저장소 만들고 연결하기

### 방법 A — GitHub CLI (가장 쉬움, 추천)

```powershell
winget install --id GitHub.cli      # 처음 한 번만 설치
gh auth login                        # 브라우저로 로그인 (화면 안내 따라가기)
gh repo create breeze-realestate --public --source=. --remote=origin --push
```

끝입니다. 이후부터는 **3번**의 명령만 반복하면 됩니다.

### 방법 B — 웹에서 직접

1. https://github.com/new 접속
2. Repository name: `breeze-realestate` → **Create repository**
3. 아래 명령으로 연결 (`내아이디` 를 본인 GitHub 아이디로 변경):

```powershell
git remote add origin https://github.com/내아이디/breeze-realestate.git
git push -u origin main
```

> 비밀번호를 물으면 일반 비밀번호가 아니라 **Personal Access Token**이 필요합니다.
> GitHub → Settings → Developer settings → Personal access tokens → "Tokens (classic)" →
> Generate new token → `repo` 권한 체크 → 생성된 토큰을 비밀번호 칸에 붙여넣기.
> (방법 A의 `gh auth login` 을 쓰면 이 과정이 필요 없습니다.)

---

## 3. 앞으로 수정할 때마다 (반복)

매물 정보(구글시트)는 자동 반영되므로 보통은 시트만 고치면 됩니다.
**홈페이지 디자인/문구**를 바꿨을 때만 아래로 다시 올립니다.

```powershell
git add .
git commit -m "수정 내용 한 줄 설명"
git push
```

VS Code에서는: 변경사항 입력칸에 메시지 → **✓ Commit** → **Sync/Push** 버튼.

---

## 4. 무료 인터넷 주소 만들기 (GitHub Pages)

1. GitHub 저장소 페이지 → **Settings** → 왼쪽 **Pages**
2. *Build and deployment* → Source: **Deploy from a branch**
3. Branch: **main** / 폴더: **/(root)** → **Save**
4. 1~2분 뒤 새로고침하면 주소가 나옵니다:
   **`https://내아이디.github.io/breeze-realestate/`**

이 주소를 명함·블로그·문자 등에 그대로 공유하시면 됩니다. 📱

> 나중에 `breeze-jeju.com` 같은 **개인 도메인**도 연결할 수 있습니다 (Pages 설정의 Custom domain). 필요하시면 알려주세요.

---

## 다음 단계

- **.exe 실행 파일**(데스크톱 GUI) 만들기 → 요청하시면 `Electron` 설정을 추가해 드립니다.
- **크롬 확장 프로그램** 만들기 → 요청하시면 `manifest.json` 등을 추가해 드립니다.

두 가지 모두 **지금 만든 웹 코드를 그대로 재사용**하므로 빠르게 추가됩니다.
