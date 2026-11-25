package io.peaches.stc

import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noCodeUnits
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noMethods
import com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS
import com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.modulith.NamedInterface
import org.springframework.modulith.core.ApplicationModules
import org.springframework.stereotype.Component
import org.springframework.stereotype.Repository
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.RestController

class ModulithArchitectureTests {
  private val productionClasses by lazy {
    ClassFileImporter()
      .withImportOption(ImportOption.DoNotIncludeTests())
      .importPackages("io.peaches.stc")
  }

  private val allProductionClasses by lazy {
    ClassFileImporter()
      .withImportOption(ImportOption.DoNotIncludeTests())
      .importPackages("io.peaches")
  }

  @Test
  fun `verifies spring modulith module boundaries`() {
    val modules = ApplicationModules.of(SpringTrafficControlApplication::class.java)
    modules.verify()
  }

  @Test
  fun `forbids @Value injection in favor of @ConfigurationProperties classes`() {
    noClasses()
      .that()
      .resideInAPackage("io.peaches.stc..")
      .should()
      .dependOnClassesThat()
      .haveFullyQualifiedName(Value::class.java.name)
      .because("Configuration must be bound via @ConfigurationProperties classes, never @Value")
      .check(productionClasses)

    noFields()
      .that()
      .areDeclaredInClassesThat()
      .resideInAPackage("io.peaches.stc..")
      .should()
      .beAnnotatedWith(Value::class.java)
      .check(productionClasses)

    noCodeUnits()
      .that()
      .areDeclaredInClassesThat()
      .resideInAPackage("io.peaches.stc..")
      .should()
      .beAnnotatedWith(Value::class.java)
      .check(productionClasses)
  }

  @Test
  fun `enforces two-level modulith package layout`() {
    classes()
      .that()
      .resideInAPackage("io.peaches.stc..")
      .should()
      .resideInAnyPackage(
        "io.peaches.stc",
        "io.peaches.stc.*",
        "io.peaches.stc.*.internal..",
      ).because("Modules must use only the module root (public API) and internal subpackage")
      .check(productionClasses)

    noClasses()
      .that()
      .resideInAPackage("io.peaches.stc..")
      .should()
      .beAnnotatedWith(NamedInterface::class.java)
      .because("Public API types belong in the module root instead of using @NamedInterface workarounds")
      .check(productionClasses)
  }

  @Test
  fun `enforces pure module root public api`() {
    noClasses()
      .that()
      .resideInAPackage("io.peaches.stc.*")
      .should()
      .dependOnClassesThat()
      .resideInAnyPackage(
        "io.peaches.stc..internal..",
        "io.peaches.support..",
        "org.springframework..",
      ).because(
        "Module root packages are pure public APIs and must not depend on " +
          "internal packages, external support DTOs, or Spring",
      ).check(productionClasses)

    classes()
      .that()
      .resideInAPackage("io.peaches.stc.*")
      .and()
      .haveSimpleNameEndingWith("Service")
      .should()
      .beInterfaces()
      .because("Public module services must be interfaces so implementations stay encapsulated in internal")
      .check(productionClasses)
  }

  @Test
  fun `enforces internal encapsulation of ports, adapters, and stereotypes`() {
    classes()
      .that()
      .haveSimpleNameEndingWith("Repository")
      .or()
      .haveSimpleNameEndingWith("SyncSource")
      .or()
      .haveSimpleNameEndingWith("Source")
      .should()
      .resideInAPackage("io.peaches.stc.*.internal..")
      .because("Persistence and outbound sync ports are module-internal and must not be exposed in the module root")
      .check(productionClasses)

    classes()
      .that()
      .areAnnotatedWith(RestController::class.java)
      .or()
      .areAnnotatedWith(Service::class.java)
      .or()
      .areAnnotatedWith(Repository::class.java)
      .or()
      .areAnnotatedWith(Component::class.java)
      .should()
      .resideInAPackage("io.peaches.stc.*.internal..")
      .because("Spring stereotypes are implementation details and must reside in a module's internal package")
      .check(productionClasses)

    noClasses()
      .that()
      .areAnnotatedWith(RestController::class.java)
      .should()
      .dependOnClassesThat()
      .haveSimpleNameEndingWith("Repository")
      .orShould()
      .dependOnClassesThat()
      .haveSimpleNameEndingWith("SyncSource")
      .orShould()
      .dependOnClassesThat()
      .haveSimpleNameEndingWith("Source")
      .because(
        "Controllers must delegate through the module's public service boundary " +
          "instead of accessing repositories or sync sources directly",
      ).check(productionClasses)
  }

  @Test
  fun `enforces jackson 3 only without legacy jackson 2 databind or core`() {
    noClasses()
      .that()
      .resideInAPackage("io.peaches..")
      .should()
      .dependOnClassesThat()
      .resideInAnyPackage(
        "com.fasterxml.jackson.databind..",
        "com.fasterxml.jackson.core..",
        "com.fasterxml.jackson.datatype..",
        "com.fasterxml.jackson.module..",
      ).because("Spring Boot 4.2 uses Jackson 3 (tools.jackson.*); legacy Jackson 2 databind/core/modules are forbidden")
      .check(allProductionClasses)
  }

  @Test
  fun `enforces modern spring boot 4 http clients over legacy rest template and manual proxies`() {
    noClasses()
      .that()
      .resideInAPackage("io.peaches..")
      .should()
      .dependOnClassesThat()
      .haveFullyQualifiedName("org.springframework.web.client.RestTemplate")
      .orShould()
      .dependOnClassesThat()
      .haveFullyQualifiedName("org.springframework.web.service.invoker.HttpServiceProxyFactory")
      .because(
        "Spring Boot 4.2 prefers declarative @HttpExchange + @ImportHttpServices and RestClient " +
          "over legacy RestTemplate or manual HttpServiceProxyFactory",
      ).check(allProductionClasses)
  }

  @Test
  fun `enforces fluent jdbc client over legacy jdbc template`() {
    noClasses()
      .that()
      .resideInAPackage("io.peaches..")
      .should()
      .dependOnClassesThat()
      .haveFullyQualifiedName("org.springframework.jdbc.core.JdbcTemplate")
      .orShould()
      .dependOnClassesThat()
      .haveFullyQualifiedName("org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate")
      .because("Spring Boot 4.2 prefers fluent JdbcClient over legacy JdbcTemplate / NamedParameterJdbcTemplate")
      .check(allProductionClasses)
  }

  @Test
  fun `enforces constructor injection without autowired fields or setters`() {
    noFields()
      .that()
      .areDeclaredInClassesThat()
      .resideInAPackage("io.peaches..")
      .should()
      .beAnnotatedWith(Autowired::class.java)
      .because("Spring Boot 4.2 + Kotlin beans must use constructor injection, never @Autowired field injection")
      .check(allProductionClasses)

    noMethods()
      .that()
      .areDeclaredInClassesThat()
      .resideInAPackage("io.peaches..")
      .should()
      .beAnnotatedWith(Autowired::class.java)
      .because("Spring Boot 4.2 + Kotlin beans must use constructor injection, never @Autowired method/setter injection")
      .check(allProductionClasses)
  }

  @Test
  fun `enforces jakarta ee 11 without legacy javax packages`() {
    noClasses()
      .that()
      .resideInAPackage("io.peaches..")
      .should()
      .dependOnClassesThat()
      .resideInAnyPackage(
        "javax.servlet..",
        "javax.persistence..",
        "javax.validation..",
        "javax.annotation..",
        "javax.inject..",
        "javax.transaction..",
      ).because("Spring Boot 4.2 targets Jakarta EE 11 (jakarta.*); legacy javax.* APIs are removed")
      .check(allProductionClasses)
  }

  @Test
  fun `enforces immutable configuration properties`() {
    fields()
      .that()
      .areDeclaredInClassesThat()
      .areAnnotatedWith(ConfigurationProperties::class.java)
      .and()
      .areNotStatic()
      .should()
      .beFinal()
      .because("@ConfigurationProperties classes in Spring Boot 4.2 + Kotlin must be immutable (val-only data classes)")
      .check(allProductionClasses)
  }

  @Test
  fun `enforces structured slf4j logging without standard streams or jul`() {
    NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS
      .because("Use SLF4J loggers integrated with Spring Boot 4.2 OpenTelemetry logging instead of System.out/System.err")
      .check(allProductionClasses)

    NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING
      .because("Use SLF4J loggers instead of java.util.logging")
      .check(allProductionClasses)
  }

  @Test
  fun `enforces declarative external api isolation in support package`() {
    classes()
      .that()
      .resideInAPackage("io.peaches.support..")
      .and()
      .haveSimpleNameEndingWith("Api")
      .should()
      .beInterfaces()
      .because("External API clients under io.peaches.support must be declarative @HttpExchange interfaces")
      .check(allProductionClasses)

    noClasses()
      .that()
      .resideInAPackage("io.peaches.support..")
      .should()
      .dependOnClassesThat()
      .resideInAPackage("io.peaches.stc..")
      .because("External support DTOs and API contracts must remain isolated from application modules")
      .check(allProductionClasses)
  }
}
