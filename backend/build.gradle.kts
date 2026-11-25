plugins {
  alias(libs.plugins.kotlin.jvm)
  alias(libs.plugins.kotlin.spring)
  alias(libs.plugins.spring.boot)
  alias(libs.plugins.spring.dependency.management)
  alias(libs.plugins.spotless)
}

group = "io.peaches.sandbox"
version = "0.0.1-SNAPSHOT"

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(25)
  }
}

dependencies {
  implementation(libs.spring.boot.starter.data.redis)
  implementation(libs.spring.boot.starter.jdbc)
  implementation(libs.spring.boot.starter.opentelemetry)
  implementation(libs.spring.boot.starter.security.oauth2.client)
  implementation(libs.spring.boot.starter.webmvc)
  implementation(libs.spring.modulith.starter.core)
  implementation(libs.kotlin.reflect)
  implementation(libs.spring.ai.starter.model.google.genai)
  implementation(libs.spring.ai.starter.model.openai)
  implementation(libs.ag.ui.java.core)
  implementation(libs.jackson.module.kotlin)
  implementation(libs.duckdb.jdbc)
  developmentOnly(libs.spring.boot.devtools)
  developmentOnly(libs.spring.boot.docker.compose)
  testImplementation(libs.spring.boot.starter.opentelemetry.test)
  testImplementation(libs.spring.boot.starter.webmvc.test)
  testImplementation(libs.spring.modulith.starter.test)
  testImplementation(libs.kotlin.test.junit5)
  testRuntimeOnly(libs.junit.platform.launcher)
}

dependencyManagement {
  imports {
    mavenBom(
      libs.spring.ai.bom
        .get()
        .toString(),
    )
    mavenBom(
      libs.spring.modulith.bom
        .get()
        .toString(),
    )
  }
}

kotlin {
  compilerOptions {
    freeCompilerArgs.addAll("-Xjsr305=strict")
  }
}

tasks.withType<Test> {
  useJUnitPlatform()
  jvmArgs("--enable-native-access=ALL-UNNAMED")
}

tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
  jvmArgs("--enable-native-access=ALL-UNNAMED")
}

spotless {
  val editorConfig = rootProject.file("../.editorconfig")
  kotlin {
    target("src/**/*.kt")
    ktlint().setEditorConfigPath(editorConfig)
  }
  kotlinGradle {
    target("*.gradle.kts")
    ktlint().setEditorConfigPath(editorConfig)
  }
}
