# Contributing to GenerativeAI-Starter-Kit

🎉 **Thank you for your interest in contributing!**

We welcome contributions from the community to make this project even better. Whether you're fixing bugs, adding features, improving documentation, or sharing examples, your help is appreciated!

## 🚀 How to Contribute

### 1️⃣ **Getting Started**

1. **Fork the repository**

   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/GenerativeAI-Starter-Kit.git
   cd GenerativeAI-Starter-Kit
   ```

2. **Set up development environment**

   ```bash
   ./automation/setup.sh
   source venv/bin/activate
   ```

3. **Run tests to ensure everything works**

   ```bash
   ./automation/run_tests.sh
   ```

### 2️⃣ **Making Changes**

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # 或者
   git checkout -b fix/issue-description
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   # Run specific tests
   python -m pytest tests/test_your_module.py -v
   
   # Run all tests
   ./automation/run_tests.sh
   
   # Test examples
   python examples/rag/simple_rag.py
   python examples/multimodal/image_text_app.py
   ```

4. **Format your code**

   ```bash
   black .
   flake8 examples/ automation/ tests/
   ```## 📝 Contribution Types

### 🐛 **Bug Fixes**

- Fix issues in existing code
- Improve error handling
- Resolve compatibility problems

### ✨ **New Features**

- Add new AI examples or techniques
- Implement additional model support
- Create new automation scripts

### 📚 **Documentation**

- Improve README files
- Add code comments
- Create tutorials or guides
- Translate documentation

### 🧪 **Tests**

- Add test cases for existing functionality
- Improve test coverage
- Create integration tests

### 🎨 **Examples**

- Add new practical examples
- Create Jupyter notebooks
- Build demo applications

## 📋 Coding Guidelines

### **Code Style**

- Use Python 3.8+ features
- Follow PEP 8 style guide
- Use type hints where appropriate
- Add docstrings to functions and classes

### **Project Structure**

```text
examples/
├── rag/          # RAG-related examples
├── multimodal/   # Image-text applications
└── fine-tuning/  # Model fine-tuning examples

automation/       # Scripts and tools
configs/          # Configuration files
docs/            # Documentation
tests/           # Test suites
notebooks/       # Jupyter tutorials
```

### **Example Code Template**

```python
"""
Module Description
==================

Brief description of what this module does.

Author: GenerativeAI-Starter-Kit
License: MIT
"""

import os
from typing import List, Dict, Any

class ExampleClass:
    """
    Brief class description.
    
    Args:
        param1: Description of parameter
        param2: Description of parameter
    """
    
    def __init__(self, param1: str, param2: int = 10):
        self.param1 = param1
        self.param2 = param2
    
    def example_method(self, input_data: List[str]) -> Dict[str, Any]:
        """
        Brief method description.
        
        Args:
            input_data: Description of input
            
        Returns:
            Description of return value
        """
        # Implementation here
        return {"result": "example"}

def demo_function():
    """Demonstrate the functionality"""
    example = ExampleClass("test")
    result = example.example_method(["sample", "data"])
    print(f"Result: {result}")

if __name__ == "__main__":
    demo_function()
```

## 🧪 Testing Guidelines

### **Writing Tests**

```python
import pytest
from your_module import YourClass

class TestYourClass:
    @pytest.fixture
    def sample_instance(self):
        return YourClass(param="test")
    
    def test_basic_functionality(self, sample_instance):
        result = sample_instance.method()
        assert result is not None
        assert isinstance(result, dict)
    
    def test_error_handling(self, sample_instance):
        with pytest.raises(ValueError):
            sample_instance.method(invalid_input)
```

### **Test Categories**

- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test component interactions
- **Example Tests**: Ensure examples run without errors

## 📖 Documentation Guidelines

### **README Updates**

- Keep the main README concise and welcoming
- Update feature lists when adding new functionality
- Include usage examples for new features

### **Code Documentation**

- Add docstrings to all public functions and classes
- Use clear, descriptive variable names
- Comment complex algorithms or business logic

### **Tutorial Creation**

- Create step-by-step guides for new features
- Include both code and explanations
- Add visualizations where helpful

## 🔄 Pull Request Process

### **Before Submitting**

1. ✅ Tests pass locally
2. ✅ Code is formatted with black
3. ✅ Documentation is updated
4. ✅ Examples run successfully
5. ✅ Commit messages are clear

### **PR Template**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tests pass locally
- [ ] Added/updated tests
- [ ] Examples work correctly

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### **Review Process**

1. **Automated checks** run on all PRs
2. **Manual review** by maintainers
3. **Feedback addressed** and discussion
4. **Merge** when approved

## 💡 Ideas for Contributions

### **High Priority**

- 🔧 More fine-tuning examples (NER, Q&A, etc.)
- 🌐 Additional language support
- 📊 Performance benchmarking tools
- 🐳 Docker deployment configs

### **Medium Priority**

- 🎨 More multimodal examples (audio, video)
- 📱 Mobile-friendly interfaces
- ☁️ Cloud deployment guides
- 🔌 Additional vector database backends

### **Nice to Have**

- 🎮 Interactive tutorials
- 📈 Advanced visualization tools
- 🤖 Chatbot integration examples
- 🏭 Industry-specific use cases

## 🆘 Getting Help

### **Questions or Issues?**

- 💬 [GitHub Discussions](https://github.com/YY-Nexus/GenerativeAI-Starter-Kit/discussions)
- 🐛 [GitHub Issues](https://github.com/YY-Nexus/GenerativeAI-Starter-Kit/issues)
- 📧 Email: [admin@0379.email](mailto:admin@0379.email)

### **Community Guidelines**

- 🤝 Be respectful and inclusive
- 🎯 Stay on topic and constructive  
- 📚 Help others learn and grow
- 🌟 Celebrate contributions and progress

## 🏆 Recognition

- 📝 Added to the CONTRIBUTORS.md file

- 🎉 Mentioned in release notes
- 🏅 Given credit in relevant documentation
- 💝 Acknowledged in the community

---

## Thank you for making GenerativeAI-Starter-Kit better for everyone! 🚀
