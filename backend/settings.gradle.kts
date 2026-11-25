pluginManagement {
  repositories {
    mavenCentral()
    gradlePluginPortal()
    maven { url = uri("https://repo.spring.io/milestone") }
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
  repositories {
    mavenCentral()
    maven { url = uri("https://repo.spring.io/milestone") }
  }
}

rootProject.name = "spring-traffic-control"
