# 비전공자를 위한 학원 클리닉 예약 사이트 배포 가이드

이 프로젝트는 인터넷 브라우저로 덮어쓰기만 하면 실시간 업데이트 되는 편리한 웹사이트입니다.

> **💡 새로운 주요 업데이트 (시험기간 모드 추가)를 위한 주의사항!**
> 저희가 새롭게 '정규 클리닉' 과 '시험기간 클리닉'을 구분하는 기능을 넣었습니다. 
> 데이터베이스가 이 구분을 기억할 수 있도록, **Supabase**의 **SQL Editor**에 들어가 아래 명령어를 딱 한 번만 복사해서 실행(Run)해 주세요! (기존 데이터를 삭제할 필요 없이 열 칸만 추가하는 안전한 명령어입니다.)
> 
> ```sql
> ALTER TABLE clinics ADD COLUMN clinic_type text default 'regular';
> ```
> *(만약 아직 테이블을 아예 처음 만드시는 상황이라면, 아래의 초기 생성 코드를 실행하시면 됩니다.)*
> ```sql
> create table clinics (
>   id uuid default gen_random_uuid() primary key,
>   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
>   student_name text not null,
>   school text not null,
>   clinic_date date not null,
>   clinic_time text not null,
>   clinic_type text default 'regular'
> );
> ```

---

## 코드 업데이트 덮어쓰기 방법
**따로 새로운 GitHub 저장소를 구하실 필요가 전혀 없습니다! 완전히 한 사이트에 통합해 놓았습니다.**
기존에 사용하시던 주소 하나로 다 됩니다.

1. 크롬을 켜서 **github.com** 에 로그인 후 `academy-clinic` 프로젝트로 들어갑니다.
2. 상단의 **`Add file` -> `Upload files`**를 누릅니다.
3. 제가 만들어드린 폴더(`academy-clinic`) 안의 모든 파일을 드래그해서 점선 박스 안에 다 던져 넣습니다.
4. 로딩이 끝나면 맨 아래의 초록색 **Commit changes** 버튼을 누릅니다.
5. 1분 뒤, `https://원래주소.vercel.app` 과 `https://원래주소.vercel.app/exam` 로 각각 두 가지 폼 접속이 모두 가능해집니다!
