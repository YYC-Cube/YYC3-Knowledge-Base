---
layout: home
title: Repomix
titleTemplate: Đóng gói codebase của bạn thành các định dạng thân thiện với AI
aside: false
editLink: false

features:
  - icon: 🤖
    title: Tối ưu hóa cho AI
    details: Định dạng codebase của bạn theo cách dễ dàng cho AI hiểu và xử lý.

  - icon: ⚙️
    title: Nhận biết Git
    details: Tự động tôn trọng các tệp .gitignore của bạn.

  - icon: 🛡️
    title: Tập trung vào bảo mật
    details: Tích hợp Secretlint để kiểm tra bảo mật mạnh mẽ nhằm phát hiện và ngăn chặn việc đưa thông tin nhạy cảm vào.

  - icon: 📊
    title: Đếm token
    details: Cung cấp số lượng token cho mỗi tệp và toàn bộ kho lưu trữ, hữu ích cho giới hạn ngữ cảnh LLM.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Đề cử Giải thưởng Mã nguồn Mở

Chúng tôi rất vinh dự! Repomix đã được đề cử cho hạng mục **Powered by AI** tại [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

Điều này không thể thực hiện được nếu không có tất cả các bạn sử dụng và hỗ trợ Repomix. Xin cảm ơn!

## Repomix là gì?

Repomix là một công cụ mạnh mẽ giúp đóng gói toàn bộ codebase của bạn thành một file thân thiện với AI. Dù bạn đang làm việc với code review, refactoring hay cần hỗ trợ AI cho dự án của mình, Repomix giúp bạn dễ dàng chia sẻ toàn bộ ngữ cảnh repository với các công cụ AI.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Bắt đầu nhanh

Sau khi bạn đã tạo một tệp đóng gói (`repomix-output.xml`) bằng Repomix, bạn có thể gửi nó đến trợ lý AI (như ChatGPT, Claude) với một prompt như:

```
Tệp này chứa tất cả các tệp trong kho lưu trữ được kết hợp thành một.
Tôi muốn tái cấu trúc mã, vì vậy hãy xem xét nó trước.
```

AI sẽ phân tích toàn bộ codebase của bạn và cung cấp những hiểu biết toàn diện:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

Khi thảo luận về các thay đổi cụ thể, AI có thể giúp tạo mã. Với các tính năng như Artifacts của Claude, bạn thậm chí có thể nhận được nhiều tệp phụ thuộc lẫn nhau:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

Chúc bạn code vui vẻ! 🚀

## Tại sao chọn Repomix?

Sức mạnh của Repomix nằm ở khả năng làm việc với các dịch vụ đăng ký như ChatGPT, Claude, Gemini, Grok mà không lo lắng về chi phí, đồng thời cung cấp ngữ cảnh codebase hoàn chỉnh giúp loại bỏ nhu cầu khám phá tệp—làm cho việc phân tích nhanh hơn và thường chính xác hơn.

Với toàn bộ codebase có sẵn làm ngữ cảnh, Repomix cho phép một loạt các ứng dụng bao gồm lập kế hoạch triển khai, điều tra lỗi, kiểm tra bảo mật thư viện bên thứ ba, tạo tài liệu và nhiều hơn nữa.

## Sử dụng công cụ CLI {#using-the-cli-tool}

Repomix có thể được sử dụng như một công cụ dòng lệnh, cung cấp các tính năng mạnh mẽ và tùy chọn tùy chỉnh.

**Công cụ CLI có thể truy cập các kho lưu trữ riêng tư** vì nó sử dụng git được cài đặt cục bộ của bạn.

### Bắt đầu nhanh

Bạn có thể thử Repomix ngay lập tức trong thư mục dự án của bạn mà không cần cài đặt:

```bash
npx repomix@latest
```

Hoặc cài đặt toàn cục để sử dụng nhiều lần:

```bash
# Cài đặt với npm
npm install -g repomix

# Hoặc với yarn
yarn global add repomix

# Hoặc với bun
bun add -g repomix

# Hoặc với Homebrew (macOS/Linux)
brew install repomix

# Sau đó chạy trong bất kỳ thư mục dự án nào
repomix
```

Vậy là xong! Repomix sẽ tạo một tệp `repomix-output.xml` trong thư mục hiện tại của bạn, chứa toàn bộ kho lưu trữ của bạn ở định dạng thân thiện với AI.



### Cách sử dụng

Để đóng gói toàn bộ kho lưu trữ của bạn:

```bash
repomix
```

Để đóng gói một thư mục cụ thể:

```bash
repomix path/to/directory
```

Để đóng gói các tệp hoặc thư mục cụ thể bằng cách sử dụng [mẫu glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Để loại trừ các tệp hoặc thư mục cụ thể:

```bash
repomix --ignore "**/*.log,tmp/"
```

Để đóng gói một kho lưu trữ từ xa:
```bash
# Sử dụng định dạng rút gọn
npx repomix --remote yamadashy/repomix

# Sử dụng URL đầy đủ (hỗ trợ nhánh và đường dẫn cụ thể)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Sử dụng commit cụ thể với --remote-branch
npx repomix --remote yamadashy/repomix --remote-branch 836abcd7335137228ad77feb28655d85712680f1
```

Để khởi tạo một tệp cấu hình mới (`repomix.config.json`):

```bash
repomix --init
```

Sau khi bạn đã tạo tệp đóng gói, bạn có thể sử dụng nó với các công cụ AI Tạo sinh như Claude, ChatGPT và Gemini.

#### Sử dụng Docker

Bạn cũng có thể chạy Repomix bằng Docker 🐳  
Điều này hữu ích nếu bạn muốn chạy Repomix trong môi trường biệt lập hoặc thích sử dụng container.

Cách sử dụng cơ bản (thư mục hiện tại):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Để đóng gói một thư mục cụ thể:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix path/to/directory
```

Xử lý một kho lưu trữ từ xa và xuất ra thư mục `output`:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Định dạng đầu ra

Chọn định dạng đầu ra ưa thích của bạn:

```bash
# Định dạng XML (mặc định)
repomix --style xml

# Định dạng Markdown
repomix --style markdown

# Định dạng JSON
repomix --style json

# Định dạng văn bản thuần túy
repomix --style plain
```

### Tùy chỉnh

Tạo một `repomix.config.json` cho các cài đặt cố định:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Các Trường Hợp Sử Dụng Thực Tế

### [Quy Trình Sinh Mã LLM](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Một nhà phát triển chia sẻ cách họ sử dụng Repomix để trích xuất ngữ cảnh mã từ các codebase hiện có, sau đó tận dụng ngữ cảnh đó với các LLM như Claude và Aider để cải tiến dần dần, đánh giá mã và tạo tài liệu tự động.

### [Tạo Gói Dữ Liệu Kiến Thức cho LLM](https://lethain.com/competitive-advantage-author-llms/)

Các tác giả đang sử dụng Repomix để đóng gói nội dung viết của họ—blog, tài liệu và sách—thành các định dạng tương thích với LLM, cho phép độc giả tương tác với chuyên môn của họ thông qua các hệ thống hỏi đáp được hỗ trợ bởi AI.

[Khám phá thêm các trường hợp sử dụng →](./guide/use-cases)

## Hướng Dẫn Người Dùng Chuyên Nghiệp

Repomix cung cấp các tính năng mạnh mẽ cho các trường hợp sử dụng nâng cao. Dưới đây là một số hướng dẫn thiết yếu cho người dùng chuyên nghiệp:

- **[Máy chủ MCP](./guide/mcp-server)** - Tích hợp Model Context Protocol cho trợ lý AI
- **[GitHub Actions](./guide/github-actions)** - Tự động hóa đóng gói codebase trong quy trình CI/CD
- **[Nén Mã](./guide/code-compress)** - Nén thông minh dựa trên Tree-sitter (~70% giảm token)
- **[Sử dụng như Thư viện](./guide/development/using-repomix-as-a-library)** - Tích hợp Repomix vào ứng dụng Node.js của bạn
- **[Hướng dẫn Tùy chỉnh](./guide/custom-instructions)** - Thêm prompt và hướng dẫn tùy chỉnh vào đầu ra
- **[Tính năng Bảo mật](./guide/security)** - Tích hợp Secretlint tích hợp sẵn và kiểm tra an toàn
- **[Thực hành Tốt nhất](./guide/tips/best-practices)** - Tối ưu hóa quy trình AI của bạn với các chiến lược đã được chứng minh

### Thêm ví dụ
::: tip Cần thêm trợ giúp? 💡
Hãy xem tài liệu toàn diện của chúng tôi trong [Hướng dẫn](/vi/guide/) hoặc khám phá [Kho lưu trữ GitHub](https://github.com/yamadashy/repomix) để biết thêm ví dụ và mã nguồn.
:::

</div>
