allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
open class FlutterStub {
    val compileSdkVersion: Int = 35
    val minSdkVersion: Int = 24
    val targetSdkVersion: Int = 35
    val ndkVersion: String = "27.0.12077973"
}

subprojects {
    plugins.whenPluginAdded {
        if (name.startsWith("com.android")) {
            val android = project.extensions.findByName("android")
            if (android is org.gradle.api.plugins.ExtensionAware) {
                if (android.extensions.findByName("flutter") == null) {
                    android.extensions.create("flutter", FlutterStub::class.java)
                }
            }
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
